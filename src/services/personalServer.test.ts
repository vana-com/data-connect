import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createGrant,
  listGrants,
  PersonalServerError,
} from "./personalServer";

// Mock Tauri HTTP plugin — personalServer.ts dynamically imports it
const tauriFetchSpy = vi.fn();
vi.mock("@tauri-apps/plugin-http", () => ({
  fetch: (...args: unknown[]) => tauriFetchSpy(...args),
}));

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

beforeEach(() => {
  tauriFetchSpy.mockReset();
});

// --- createGrant ---

describe("createGrant", () => {
  it("sends POST to /v1/grants on the correct port", async () => {
    tauriFetchSpy.mockResolvedValueOnce(
      jsonResponse({ grantId: "grant-abc" })
    );

    const result = await createGrant(3100, {
      granteeAddress: "0xbuilder",
      scopes: ["chatgpt.conversations"],
    });

    expect(tauriFetchSpy).toHaveBeenCalledOnce();
    const [url, init] = tauriFetchSpy.mock.calls[0];
    expect(url).toBe("http://localhost:3100/v1/grants");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(init.body)).toEqual({
      granteeAddress: "0xbuilder",
      scopes: ["chatgpt.conversations"],
    });
    expect(result).toEqual({ grantId: "grant-abc" });
  });

  it("includes optional expiresAt and nonce", async () => {
    tauriFetchSpy.mockResolvedValueOnce(
      jsonResponse({ grantId: "grant-xyz" })
    );

    await createGrant(3100, {
      granteeAddress: "0xbuilder",
      scopes: ["spotify.history"],
      expiresAt: "2026-12-31T00:00:00Z",
      nonce: "nonce-1",
    });

    const body = JSON.parse(tauriFetchSpy.mock.calls[0][1].body);
    expect(body.expiresAt).toBe("2026-12-31T00:00:00Z");
    expect(body.nonce).toBe("nonce-1");
  });

  it("throws PersonalServerError on network failure", async () => {
    tauriFetchSpy.mockRejectedValueOnce(new TypeError("Connection refused"));

    await expect(
      createGrant(3100, {
        granteeAddress: "0x",
        scopes: [],
      })
    ).rejects.toThrow(PersonalServerError);

    tauriFetchSpy.mockRejectedValueOnce(new TypeError("Connection refused"));
    await expect(
      createGrant(3100, {
        granteeAddress: "0x",
        scopes: [],
      })
    ).rejects.toThrow("Failed to connect");
  });

  it("throws PersonalServerError on non-JSON response", async () => {
    tauriFetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: () => Promise.reject(new Error("not json")),
    } as unknown as Response);

    await expect(
      createGrant(3100, { granteeAddress: "0x", scopes: [] })
    ).rejects.toThrow("non-JSON response");
  });

  it("throws PersonalServerError with server error message", async () => {
    tauriFetchSpy.mockResolvedValueOnce(
      jsonResponse({ error: "Invalid grantee address" }, 400)
    );

    await expect(
      createGrant(3100, { granteeAddress: "bad", scopes: [] })
    ).rejects.toMatchObject({
      message: "Invalid grantee address",
      statusCode: 400,
    });
  });

  it("throws generic error when HTTP error body has no error field", async () => {
    tauriFetchSpy.mockResolvedValueOnce(
      jsonResponse({ detail: "unknown" }, 500)
    );

    await expect(
      createGrant(3100, { granteeAddress: "0x", scopes: [] })
    ).rejects.toThrow("HTTP 500");
  });
});

// --- listGrants ---

describe("listGrants", () => {
  it("sends GET to /v1/grants on the correct port", async () => {
    const grants = [
      {
        grantId: "g-1",
        granteeAddress: "0xabc",
        scopes: ["chatgpt.conversations"],
        createdAt: "2026-01-01T00:00:00Z",
      },
      {
        grantId: "g-2",
        granteeAddress: "0xdef",
        scopes: ["spotify.history"],
        createdAt: "2026-02-01T00:00:00Z",
        revokedAt: "2026-02-05T00:00:00Z",
      },
    ];
    tauriFetchSpy.mockResolvedValueOnce(jsonResponse(grants));

    const result = await listGrants(4200);

    expect(tauriFetchSpy).toHaveBeenCalledOnce();
    const [url, init] = tauriFetchSpy.mock.calls[0];
    expect(url).toBe("http://localhost:4200/v1/grants");
    expect(init.method).toBe("GET");
    expect(result).toEqual(grants);
    expect(result).toHaveLength(2);
  });

  it("returns empty array when no grants exist", async () => {
    tauriFetchSpy.mockResolvedValueOnce(jsonResponse([]));

    const result = await listGrants(3100);
    expect(result).toEqual([]);
  });

  it("throws PersonalServerError when server is not running", async () => {
    tauriFetchSpy.mockRejectedValueOnce(new TypeError("Connection refused"));

    await expect(listGrants(3100)).rejects.toThrow("Failed to connect");
  });

  it("throws with status code on HTTP error", async () => {
    tauriFetchSpy.mockResolvedValueOnce(
      jsonResponse({ error: "Unauthorized" }, 401)
    );

    await expect(listGrants(3100)).rejects.toMatchObject({
      message: "Unauthorized",
      statusCode: 401,
    });
  });
});
