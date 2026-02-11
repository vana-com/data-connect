import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock viem/utils before importing builder — vi.hoisted ensures the fn
// is available when vi.mock's factory runs (vi.mock is hoisted above imports).
const { verifyMessageMock } = vi.hoisted(() => ({
  verifyMessageMock: vi.fn(),
}));
vi.mock("viem/utils", () => ({
  verifyMessage: verifyMessageMock,
}));

import { verifyBuilder } from "./builder";

const fetchSpy = vi.fn();
vi.stubGlobal("fetch", fetchSpy);

// --- Test fixtures ---

const BUILDER_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";
const BUILDER_APP_URL = "https://builder-app.example.com";

const gatewayResponse = {
  data: {
    id: "builder-1",
    appUrl: BUILDER_APP_URL,
    publicKey: "0xpubkey",
  },
};

const appHtml = `
<!DOCTYPE html>
<html>
<head>
  <link rel="manifest" href="/manifest.json">
</head>
<body></body>
</html>
`;

const manifestJson = {
  name: "My Builder App",
  short_name: "Builder",
  icons: [
    { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
    { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
  ],
  vana: {
    appUrl: "https://builder-app.example.com",
    privacyPolicyUrl: "https://builder-app.example.com/privacy",
    termsUrl: "https://builder-app.example.com/terms",
    supportUrl: "https://builder-app.example.com/support",
    signature: "0xsig123",
  },
};

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response;
}

function textResponse(text: string, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(text),
    json: () => Promise.reject(new SyntaxError("Unexpected token")),
  } as Response;
}

// Arrange the 2-call chain: gateway → direct manifest JSON (Phase 1 succeeds)
function mockHappyPath() {
  fetchSpy
    .mockResolvedValueOnce(jsonResponse(gatewayResponse)) // Gateway lookup
    .mockResolvedValueOnce(jsonResponse(manifestJson)); // Direct /manifest.json
}

// Arrange the 4-call chain: gateway → direct 404 → app HTML → manifest JSON
function mockFallbackPath() {
  fetchSpy
    .mockResolvedValueOnce(jsonResponse(gatewayResponse)) // Gateway lookup
    .mockResolvedValueOnce(jsonResponse({}, 404)) // Direct /manifest.json → 404
    .mockResolvedValueOnce(textResponse(appHtml)) // App HTML
    .mockResolvedValueOnce(jsonResponse(manifestJson)); // Manifest JSON from link tag
}

beforeEach(() => {
  fetchSpy.mockReset();
  verifyMessageMock.mockReset();
  // Default: signature verification passes
  verifyMessageMock.mockResolvedValue(true);
});

// --- Happy path ---

describe("verifyBuilder — happy path", () => {
  it("returns BuilderManifest with correct fields", async () => {
    mockHappyPath();

    const result = await verifyBuilder(BUILDER_ADDRESS);

    expect(result).toEqual({
      name: "My Builder App",
      description: undefined,
      icons: [
        {
          src: "https://builder-app.example.com/icon-192.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: "https://builder-app.example.com/icon-512.png",
          sizes: "512x512",
          type: "image/png",
        },
      ],
      appUrl: "https://builder-app.example.com",
      privacyPolicyUrl: "https://builder-app.example.com/privacy",
      termsUrl: "https://builder-app.example.com/terms",
      supportUrl: "https://builder-app.example.com/support",
      verified: true,
    });
  });

  it("calls Gateway with correct URL including encoded address", async () => {
    mockHappyPath();
    await verifyBuilder(BUILDER_ADDRESS);

    const gatewayCall = fetchSpy.mock.calls[0];
    expect(gatewayCall[0]).toContain(`/v1/builders/${BUILDER_ADDRESS}`);
  });

  it("fetches /manifest.json directly from builder appUrl", async () => {
    mockHappyPath();
    await verifyBuilder(BUILDER_ADDRESS);

    const directCall = fetchSpy.mock.calls[1];
    expect(directCall[0]).toBe(
      "https://builder-app.example.com/manifest.json"
    );
    // Only 2 fetches — no HTML scraping needed
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("uses short_name when name is absent", async () => {
    const noNameManifest = { ...manifestJson, name: undefined };
    fetchSpy
      .mockResolvedValueOnce(jsonResponse(gatewayResponse))
      .mockResolvedValueOnce(jsonResponse(noNameManifest));

    const result = await verifyBuilder(BUILDER_ADDRESS);
    expect(result.name).toBe("Builder");
  });

  it("falls back to granteeAddress when both name and short_name absent", async () => {
    const noNamesManifest = {
      ...manifestJson,
      name: undefined,
      short_name: undefined,
    };
    fetchSpy
      .mockResolvedValueOnce(jsonResponse(gatewayResponse))
      .mockResolvedValueOnce(jsonResponse(noNamesManifest));

    // Will throw because both name and short_name are missing
    await expect(verifyBuilder(BUILDER_ADDRESS)).rejects.toThrow(
      "missing required 'name'"
    );
  });

  it("returns undefined icons when manifest has none", async () => {
    const noIconsManifest = { ...manifestJson, icons: [] };
    fetchSpy
      .mockResolvedValueOnce(jsonResponse(gatewayResponse))
      .mockResolvedValueOnce(jsonResponse(noIconsManifest));

    const result = await verifyBuilder(BUILDER_ADDRESS);
    expect(result.icons).toBeUndefined();
  });

  it("extracts description from manifest", async () => {
    const withDescription = {
      ...manifestJson,
      description: "Analyzes your conversations for fun facts",
    };
    fetchSpy
      .mockResolvedValueOnce(jsonResponse(gatewayResponse))
      .mockResolvedValueOnce(jsonResponse(withDescription));

    const result = await verifyBuilder(BUILDER_ADDRESS);
    expect(result.description).toBe(
      "Analyzes your conversations for fun facts"
    );
    expect(result.verified).toBe(true);
  });

  it("throws when vana.appUrl is absent (required field)", async () => {
    const noVanaAppUrl = {
      ...manifestJson,
      vana: { ...manifestJson.vana, appUrl: undefined },
    };
    fetchSpy
      .mockResolvedValueOnce(jsonResponse(gatewayResponse))
      .mockResolvedValueOnce(jsonResponse(noVanaAppUrl));

    await expect(verifyBuilder(BUILDER_ADDRESS)).rejects.toThrow(
      "missing required 'appUrl'"
    );
  });

  it("throws when vana.appUrl does not match on-chain appUrl", async () => {
    const mismatchedAppUrl = {
      ...manifestJson,
      vana: { ...manifestJson.vana, appUrl: "https://evil.example.com" },
    };
    fetchSpy
      .mockResolvedValueOnce(jsonResponse(gatewayResponse))
      .mockResolvedValueOnce(jsonResponse(mismatchedAppUrl));

    await expect(verifyBuilder(BUILDER_ADDRESS)).rejects.toThrow(
      "does not match on-chain appUrl"
    );
  });
});

// --- Manifest link parsing ---

describe("verifyBuilder — manifest link parsing (fallback)", () => {
  it("handles href before rel attribute order", async () => {
    const altHtml = `<html><head><link href="/alt-manifest.json" rel="manifest"></head></html>`;
    fetchSpy
      .mockResolvedValueOnce(jsonResponse(gatewayResponse))
      .mockResolvedValueOnce(jsonResponse({}, 404)) // direct 404
      .mockResolvedValueOnce(textResponse(altHtml))
      .mockResolvedValueOnce(jsonResponse(manifestJson));

    await verifyBuilder(BUILDER_ADDRESS);

    const manifestCall = fetchSpy.mock.calls[3];
    expect(manifestCall[0]).toBe(
      "https://builder-app.example.com/alt-manifest.json"
    );
  });

  it("resolves relative manifest URLs against appUrl", async () => {
    const relativeHtml = `<html><head><link rel="manifest" href="./deep/manifest.json"></head></html>`;
    fetchSpy
      .mockResolvedValueOnce(jsonResponse(gatewayResponse))
      .mockResolvedValueOnce(jsonResponse({}, 404)) // direct 404
      .mockResolvedValueOnce(textResponse(relativeHtml))
      .mockResolvedValueOnce(jsonResponse(manifestJson));

    await verifyBuilder(BUILDER_ADDRESS);

    const manifestCall = fetchSpy.mock.calls[3];
    expect(manifestCall[0]).toBe(
      "https://builder-app.example.com/deep/manifest.json"
    );
  });
});

// --- Gateway errors ---

describe("verifyBuilder — Gateway errors", () => {
  it("throws on Gateway network error", async () => {
    fetchSpy.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    await expect(verifyBuilder(BUILDER_ADDRESS)).rejects.toThrow(
      "Failed to reach Gateway"
    );
  });

  it("throws on 404 — builder not registered", async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse({}, 404));

    await expect(verifyBuilder(BUILDER_ADDRESS)).rejects.toThrow(
      "not registered"
    );
  });

  it("throws on other HTTP errors", async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse({}, 500));

    await expect(verifyBuilder(BUILDER_ADDRESS)).rejects.toThrow("HTTP 500");
  });

  it("throws when Gateway returns empty appUrl", async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonResponse({ data: { id: "builder-1", appUrl: "", publicKey: "0xpubkey" } })
    );

    await expect(verifyBuilder(BUILDER_ADDRESS)).rejects.toThrow(
      "Builder registration incomplete: no appUrl returned by Gateway"
    );
  });
});

// --- App HTML errors ---

describe("verifyBuilder — app HTML errors (fallback path)", () => {
  it("throws when app is unreachable", async () => {
    fetchSpy
      .mockResolvedValueOnce(jsonResponse(gatewayResponse))
      .mockResolvedValueOnce(jsonResponse({}, 404)) // direct 404
      .mockRejectedValueOnce(new TypeError("Failed to fetch"));

    await expect(verifyBuilder(BUILDER_ADDRESS)).rejects.toThrow(
      "unreachable"
    );
  });

  it("throws when app returns non-200", async () => {
    fetchSpy
      .mockResolvedValueOnce(jsonResponse(gatewayResponse))
      .mockResolvedValueOnce(jsonResponse({}, 404)) // direct 404
      .mockResolvedValueOnce(textResponse("", 503));

    await expect(verifyBuilder(BUILDER_ADDRESS)).rejects.toThrow("HTTP 503");
  });

  it("throws when HTML has no manifest link", async () => {
    fetchSpy
      .mockResolvedValueOnce(jsonResponse(gatewayResponse))
      .mockResolvedValueOnce(jsonResponse({}, 404)) // direct 404
      .mockResolvedValueOnce(
        textResponse("<html><head></head><body></body></html>")
      );

    await expect(verifyBuilder(BUILDER_ADDRESS)).rejects.toThrow(
      'does not contain a <link rel="manifest">'
    );
  });

  it("throws when manifest URL is cross-origin", async () => {
    const crossOriginHtml = `<html><head><link rel="manifest" href="https://evil.com/manifest.json"></head></html>`;
    fetchSpy
      .mockResolvedValueOnce(jsonResponse(gatewayResponse))
      .mockResolvedValueOnce(jsonResponse({}, 404)) // direct 404
      .mockResolvedValueOnce(textResponse(crossOriginHtml));

    await expect(verifyBuilder(BUILDER_ADDRESS)).rejects.toThrow(
      "not same-origin"
    );
  });
});

// --- Manifest JSON errors ---

describe("verifyBuilder — manifest errors (fallback path)", () => {
  it("throws when manifest is unreachable", async () => {
    fetchSpy
      .mockResolvedValueOnce(jsonResponse(gatewayResponse))
      .mockResolvedValueOnce(jsonResponse({}, 404)) // direct 404
      .mockResolvedValueOnce(textResponse(appHtml))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"));

    await expect(verifyBuilder(BUILDER_ADDRESS)).rejects.toThrow(
      "unreachable"
    );
  });

  it("throws when manifest returns non-200", async () => {
    fetchSpy
      .mockResolvedValueOnce(jsonResponse(gatewayResponse))
      .mockResolvedValueOnce(jsonResponse({}, 404)) // direct 404
      .mockResolvedValueOnce(textResponse(appHtml))
      .mockResolvedValueOnce(jsonResponse({}, 404));

    await expect(verifyBuilder(BUILDER_ADDRESS)).rejects.toThrow("HTTP 404");
  });

  it("throws when manifest has no name or short_name", async () => {
    fetchSpy
      .mockResolvedValueOnce(jsonResponse(gatewayResponse))
      .mockResolvedValueOnce(jsonResponse({}, 404)) // direct 404
      .mockResolvedValueOnce(textResponse(appHtml))
      .mockResolvedValueOnce(
        jsonResponse({ vana: { signature: "0x" } })
      );

    await expect(verifyBuilder(BUILDER_ADDRESS)).rejects.toThrow(
      "missing required 'name'"
    );
  });

  it("throws when manifest has no vana block", async () => {
    fetchSpy
      .mockResolvedValueOnce(jsonResponse(gatewayResponse))
      .mockResolvedValueOnce(jsonResponse({}, 404)) // direct 404
      .mockResolvedValueOnce(textResponse(appHtml))
      .mockResolvedValueOnce(jsonResponse({ name: "App" }));

    await expect(verifyBuilder(BUILDER_ADDRESS)).rejects.toThrow(
      "missing 'vana' block"
    );
  });

  it("throws when vana.signature is absent (required field)", async () => {
    const noSigManifest = {
      ...manifestJson,
      vana: { ...manifestJson.vana, signature: undefined },
    };
    fetchSpy
      .mockResolvedValueOnce(jsonResponse(gatewayResponse))
      .mockResolvedValueOnce(jsonResponse({}, 404)) // direct 404
      .mockResolvedValueOnce(textResponse(appHtml))
      .mockResolvedValueOnce(jsonResponse(noSigManifest));

    await expect(verifyBuilder(BUILDER_ADDRESS)).rejects.toThrow(
      "missing required 'signature'"
    );
    expect(verifyMessageMock).not.toHaveBeenCalled();
  });
});

// --- EIP-191 signature verification ---

describe("verifyBuilder — signature verification", () => {
  it("calls verifyMessage with canonical JSON (sorted keys, no signature field)", async () => {
    mockHappyPath();
    await verifyBuilder(BUILDER_ADDRESS);

    expect(verifyMessageMock).toHaveBeenCalledOnce();
    const call = verifyMessageMock.mock.calls[0][0];
    expect(call.address).toBe(BUILDER_ADDRESS);
    expect(call.signature).toBe("0xsig123");

    // Canonical JSON: sorted keys, signature excluded
    const parsed = JSON.parse(call.message);
    const keys = Object.keys(parsed);
    expect(keys).toEqual([...keys].sort());
    expect(keys).not.toContain("signature");
    expect(parsed.appUrl).toBe("https://builder-app.example.com");
    expect(parsed.privacyPolicyUrl).toBe(
      "https://builder-app.example.com/privacy"
    );
  });

  it("throws when signature verification fails", async () => {
    verifyMessageMock.mockResolvedValue(false);
    fetchSpy
      .mockResolvedValueOnce(jsonResponse(gatewayResponse))
      .mockResolvedValueOnce(jsonResponse(manifestJson));

    await expect(verifyBuilder(BUILDER_ADDRESS)).rejects.toThrow(
      "signature is invalid"
    );
  });

  it("passes when sessionWebhookUrl matches vana.webhookUrl", async () => {
    const withWebhook = {
      ...manifestJson,
      vana: { ...manifestJson.vana, webhookUrl: "https://builder-app.example.com/webhook" },
    };
    fetchSpy
      .mockResolvedValueOnce(jsonResponse(gatewayResponse))
      .mockResolvedValueOnce(jsonResponse(withWebhook));

    const result = await verifyBuilder(
      BUILDER_ADDRESS,
      "https://builder-app.example.com/webhook"
    );
    expect(result.verified).toBe(true);
  });

  it("throws when sessionWebhookUrl does not match vana.webhookUrl", async () => {
    const withWebhook = {
      ...manifestJson,
      vana: { ...manifestJson.vana, webhookUrl: "https://builder-app.example.com/webhook" },
    };
    fetchSpy
      .mockResolvedValueOnce(jsonResponse(gatewayResponse))
      .mockResolvedValueOnce(jsonResponse(withWebhook));

    await expect(
      verifyBuilder(BUILDER_ADDRESS, "https://evil.example.com/webhook")
    ).rejects.toThrow("does not match manifest vana.webhookUrl");
  });

  it("skips webhookUrl check when session has no webhookUrl", async () => {
    mockHappyPath();

    // No sessionWebhookUrl passed — should not throw
    const result = await verifyBuilder(BUILDER_ADDRESS);
    expect(result.verified).toBe(true);
  });

  it("excludes undefined vana fields from canonical JSON", async () => {
    const minimalVana = {
      ...manifestJson,
      vana: {
        appUrl: "https://builder-app.example.com",
        signature: "0xsig456",
      },
    };
    fetchSpy
      .mockResolvedValueOnce(jsonResponse(gatewayResponse))
      .mockResolvedValueOnce(jsonResponse(minimalVana));

    await verifyBuilder(BUILDER_ADDRESS);

    const call = verifyMessageMock.mock.calls[0][0];
    const parsed = JSON.parse(call.message);
    expect(Object.keys(parsed)).toEqual(["appUrl"]);
  });
});

// --- Direct manifest fetch ---

describe("verifyBuilder — direct manifest fetch", () => {
  it("fetches /manifest.json directly before HTML scraping", async () => {
    mockHappyPath();
    await verifyBuilder(BUILDER_ADDRESS);

    // Call 0: Gateway, Call 1: direct /manifest.json
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy.mock.calls[1][0]).toBe(
      "https://builder-app.example.com/manifest.json"
    );
  });

  it("falls back to HTML scraping on 404", async () => {
    mockFallbackPath();
    await verifyBuilder(BUILDER_ADDRESS);

    // Call 0: Gateway, Call 1: direct 404, Call 2: HTML, Call 3: manifest from link
    expect(fetchSpy).toHaveBeenCalledTimes(4);
    expect(fetchSpy.mock.calls[1][0]).toBe(
      "https://builder-app.example.com/manifest.json"
    );
    expect(fetchSpy.mock.calls[2][0]).toBe(BUILDER_APP_URL);
  });

  it("falls back to HTML scraping on network error", async () => {
    fetchSpy
      .mockResolvedValueOnce(jsonResponse(gatewayResponse))
      .mockRejectedValueOnce(new TypeError("Failed to fetch")) // direct network error
      .mockResolvedValueOnce(textResponse(appHtml))
      .mockResolvedValueOnce(jsonResponse(manifestJson));

    const result = await verifyBuilder(BUILDER_ADDRESS);

    expect(fetchSpy).toHaveBeenCalledTimes(4);
    expect(result.verified).toBe(true);
  });

  it("falls back to HTML scraping on non-JSON 200 response", async () => {
    fetchSpy
      .mockResolvedValueOnce(jsonResponse(gatewayResponse))
      .mockResolvedValueOnce(textResponse("<html>not json</html>")) // direct returns HTML (json() rejects)
      .mockResolvedValueOnce(textResponse(appHtml))
      .mockResolvedValueOnce(jsonResponse(manifestJson));

    const result = await verifyBuilder(BUILDER_ADDRESS);

    expect(fetchSpy).toHaveBeenCalledTimes(4);
    expect(result.verified).toBe(true);
  });

  it("throws when both direct fetch and HTML scraping fail", async () => {
    fetchSpy
      .mockResolvedValueOnce(jsonResponse(gatewayResponse))
      .mockResolvedValueOnce(jsonResponse({}, 404)) // direct 404
      .mockResolvedValueOnce(
        textResponse("<html><head></head><body></body></html>") // HTML with no manifest link
      );

    await expect(verifyBuilder(BUILDER_ADDRESS)).rejects.toThrow(
      'does not contain a <link rel="manifest">'
    );
  });
});
