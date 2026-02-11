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
  id: "builder-1",
  appUrl: BUILDER_APP_URL,
  publicKey: "0xpubkey",
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
  } as Response;
}

// Arrange the 3-call chain: gateway → app HTML → manifest JSON
function mockHappyPath() {
  fetchSpy
    .mockResolvedValueOnce(jsonResponse(gatewayResponse)) // Gateway lookup
    .mockResolvedValueOnce(textResponse(appHtml)) // App HTML
    .mockResolvedValueOnce(jsonResponse(manifestJson)); // Manifest JSON
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

  it("fetches the app URL returned by Gateway", async () => {
    mockHappyPath();
    await verifyBuilder(BUILDER_ADDRESS);

    const appCall = fetchSpy.mock.calls[1];
    expect(appCall[0]).toBe(BUILDER_APP_URL);
  });

  it("fetches manifest from link tag href resolved against appUrl", async () => {
    mockHappyPath();
    await verifyBuilder(BUILDER_ADDRESS);

    const manifestCall = fetchSpy.mock.calls[2];
    expect(manifestCall[0]).toBe(
      "https://builder-app.example.com/manifest.json"
    );
  });

  it("uses short_name when name is absent", async () => {
    const noNameManifest = { ...manifestJson, name: undefined };
    fetchSpy
      .mockResolvedValueOnce(jsonResponse(gatewayResponse))
      .mockResolvedValueOnce(textResponse(appHtml))
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
    // Still has vana block, so it won't throw for missing vana
    fetchSpy
      .mockResolvedValueOnce(jsonResponse(gatewayResponse))
      .mockResolvedValueOnce(textResponse(appHtml))
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
      .mockResolvedValueOnce(textResponse(appHtml))
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
      .mockResolvedValueOnce(textResponse(appHtml))
      .mockResolvedValueOnce(jsonResponse(withDescription));

    const result = await verifyBuilder(BUILDER_ADDRESS);
    expect(result.description).toBe(
      "Analyzes your conversations for fun facts"
    );
    expect(result.verified).toBe(true);
  });

  it("uses builder.appUrl from Gateway when vana.appUrl is absent", async () => {
    const noVanaAppUrl = {
      ...manifestJson,
      vana: { ...manifestJson.vana, appUrl: undefined },
    };
    fetchSpy
      .mockResolvedValueOnce(jsonResponse(gatewayResponse))
      .mockResolvedValueOnce(textResponse(appHtml))
      .mockResolvedValueOnce(jsonResponse(noVanaAppUrl));

    const result = await verifyBuilder(BUILDER_ADDRESS);
    expect(result.appUrl).toBe(BUILDER_APP_URL);
  });
});

// --- Manifest link parsing ---

describe("verifyBuilder — manifest link parsing", () => {
  it("handles href before rel attribute order", async () => {
    const altHtml = `<html><head><link href="/alt-manifest.json" rel="manifest"></head></html>`;
    fetchSpy
      .mockResolvedValueOnce(jsonResponse(gatewayResponse))
      .mockResolvedValueOnce(textResponse(altHtml))
      .mockResolvedValueOnce(jsonResponse(manifestJson));

    await verifyBuilder(BUILDER_ADDRESS);

    const manifestCall = fetchSpy.mock.calls[2];
    expect(manifestCall[0]).toBe(
      "https://builder-app.example.com/alt-manifest.json"
    );
  });

  it("resolves relative manifest URLs against appUrl", async () => {
    const relativeHtml = `<html><head><link rel="manifest" href="./deep/manifest.json"></head></html>`;
    fetchSpy
      .mockResolvedValueOnce(jsonResponse(gatewayResponse))
      .mockResolvedValueOnce(textResponse(relativeHtml))
      .mockResolvedValueOnce(jsonResponse(manifestJson));

    await verifyBuilder(BUILDER_ADDRESS);

    const manifestCall = fetchSpy.mock.calls[2];
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
});

// --- App HTML errors ---

describe("verifyBuilder — app HTML errors", () => {
  it("throws when app is unreachable", async () => {
    fetchSpy
      .mockResolvedValueOnce(jsonResponse(gatewayResponse))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"));

    await expect(verifyBuilder(BUILDER_ADDRESS)).rejects.toThrow(
      "unreachable"
    );
  });

  it("throws when app returns non-200", async () => {
    fetchSpy
      .mockResolvedValueOnce(jsonResponse(gatewayResponse))
      .mockResolvedValueOnce(textResponse("", 503));

    await expect(verifyBuilder(BUILDER_ADDRESS)).rejects.toThrow("HTTP 503");
  });

  it("throws when HTML has no manifest link", async () => {
    fetchSpy
      .mockResolvedValueOnce(jsonResponse(gatewayResponse))
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
      .mockResolvedValueOnce(textResponse(crossOriginHtml));

    await expect(verifyBuilder(BUILDER_ADDRESS)).rejects.toThrow(
      "not same-origin"
    );
  });
});

// --- Manifest JSON errors ---

describe("verifyBuilder — manifest errors", () => {
  it("throws when manifest is unreachable", async () => {
    fetchSpy
      .mockResolvedValueOnce(jsonResponse(gatewayResponse))
      .mockResolvedValueOnce(textResponse(appHtml))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"));

    await expect(verifyBuilder(BUILDER_ADDRESS)).rejects.toThrow(
      "unreachable"
    );
  });

  it("throws when manifest returns non-200", async () => {
    fetchSpy
      .mockResolvedValueOnce(jsonResponse(gatewayResponse))
      .mockResolvedValueOnce(textResponse(appHtml))
      .mockResolvedValueOnce(jsonResponse({}, 404));

    await expect(verifyBuilder(BUILDER_ADDRESS)).rejects.toThrow("HTTP 404");
  });

  it("throws when manifest has no name or short_name", async () => {
    fetchSpy
      .mockResolvedValueOnce(jsonResponse(gatewayResponse))
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
      .mockResolvedValueOnce(textResponse(appHtml))
      .mockResolvedValueOnce(jsonResponse({ name: "App" }));

    await expect(verifyBuilder(BUILDER_ADDRESS)).rejects.toThrow(
      "missing 'vana' block"
    );
  });

  it("returns verified=false when vana.signature is absent", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const noSigManifest = {
      ...manifestJson,
      vana: { ...manifestJson.vana, signature: undefined },
    };
    fetchSpy
      .mockResolvedValueOnce(jsonResponse(gatewayResponse))
      .mockResolvedValueOnce(textResponse(appHtml))
      .mockResolvedValueOnce(jsonResponse(noSigManifest));

    const result = await verifyBuilder(BUILDER_ADDRESS);
    expect(result.name).toBe("My Builder App");
    expect(result.verified).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("no signature")
    );
    expect(verifyMessageMock).not.toHaveBeenCalled();
    warnSpy.mockRestore();
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
      .mockResolvedValueOnce(textResponse(appHtml))
      .mockResolvedValueOnce(jsonResponse(manifestJson));

    await expect(verifyBuilder(BUILDER_ADDRESS)).rejects.toThrow(
      "signature is invalid"
    );
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
      .mockResolvedValueOnce(textResponse(appHtml))
      .mockResolvedValueOnce(jsonResponse(minimalVana));

    await verifyBuilder(BUILDER_ADDRESS);

    const call = verifyMessageMock.mock.calls[0][0];
    const parsed = JSON.parse(call.message);
    expect(Object.keys(parsed)).toEqual(["appUrl"]);
  });
});
