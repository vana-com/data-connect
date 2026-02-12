import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  claimSession,
  approveSession,
  denySession,
  SessionRelayError,
  _resetClaimCache,
} from "./sessionRelay";

const fetchSpy = vi.fn();
vi.stubGlobal("fetch", fetchSpy);

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

beforeEach(() => {
  fetchSpy.mockReset();
  _resetClaimCache();
});

// --- claimSession ---

describe("claimSession", () => {
  it("sends POST to /v1/session/claim with sessionId and secret", async () => {
    const responseBody = {
      sessionId: "sess-1",
      granteeAddress: "0xabc",
      scopes: ["chatgpt.conversations"],
      expiresAt: "2026-12-31T00:00:00Z",
    };
    fetchSpy.mockResolvedValueOnce(jsonResponse(responseBody));

    const result = await claimSession({
      sessionId: "sess-1",
      secret: "s3cret",
    });

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://session-relay-git-dev-opendatalabs.vercel.app/v1/session/claim");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(init.body)).toEqual({
      sessionId: "sess-1",
      secret: "s3cret",
    });
    expect(result).toEqual(responseBody);
  });

  it("returns optional fields (webhookUrl, appUserId) when present", async () => {
    const responseBody = {
      sessionId: "sess-2",
      granteeAddress: "0xdef",
      scopes: ["spotify.history"],
      expiresAt: "2026-06-01T00:00:00Z",
      webhookUrl: "https://builder.app/webhook",
      appUserId: "user-42",
    };
    fetchSpy.mockResolvedValueOnce(jsonResponse(responseBody));

    const result = await claimSession({
      sessionId: "sess-2",
      secret: "key",
    });
    expect(result.webhookUrl).toBe("https://builder.app/webhook");
    expect(result.appUserId).toBe("user-42");
  });

  it("throws SessionRelayError with errorCode on structured error", async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonResponse(
        {
          error: {
            code: 404,
            errorCode: "SESSION_NOT_FOUND",
            message: "Session does not exist",
          },
        },
        404
      )
    );

    await expect(
      claimSession({ sessionId: "missing", secret: "x" })
    ).rejects.toThrow(SessionRelayError);

    try {
      fetchSpy.mockResolvedValueOnce(
        jsonResponse(
          {
            error: {
              code: 404,
              errorCode: "SESSION_NOT_FOUND",
              message: "Session does not exist",
            },
          },
          404
        )
      );
      await claimSession({ sessionId: "missing", secret: "x" });
    } catch (e) {
      const err = e as SessionRelayError;
      expect(err.message).toBe("Session does not exist");
      expect(err.errorCode).toBe("SESSION_NOT_FOUND");
      expect(err.statusCode).toBe(404);
    }
  });

  it("throws SessionRelayError with INVALID_CLAIM_SECRET", async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonResponse(
        {
          error: {
            code: 403,
            errorCode: "INVALID_CLAIM_SECRET",
            message: "Secret does not match",
          },
        },
        403
      )
    );

    await expect(
      claimSession({ sessionId: "sess-1", secret: "wrong" })
    ).rejects.toMatchObject({
      errorCode: "INVALID_CLAIM_SECRET",
      statusCode: 403,
    });
  });

  it("throws SessionRelayError on non-JSON response", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: () => Promise.reject(new Error("not json")),
    } as unknown as Response);

    await expect(
      claimSession({ sessionId: "sess-1", secret: "x" })
    ).rejects.toThrow("non-JSON response");
  });

  it("throws SessionRelayError on network error", async () => {
    fetchSpy.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    await expect(
      claimSession({ sessionId: "sess-1", secret: "x" })
    ).rejects.toThrow("Network error");
  });

  it("throws generic error when HTTP error has no structured body", async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonResponse({ unexpected: "format" }, 500)
    );

    await expect(
      claimSession({ sessionId: "sess-1", secret: "x" })
    ).rejects.toThrow("HTTP 500");
  });
});

// --- approveSession ---

describe("approveSession", () => {
  it("sends POST to /v1/session/{id}/approve with body", async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse({}));

    await approveSession("sess-1", {
      secret: "s3cret",
      grantId: "grant-123",
      userAddress: "0xuser",
      scopes: ["chatgpt.conversations"],
    });

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe(
      "https://session-relay-git-dev-opendatalabs.vercel.app/v1/session/sess-1/approve"
    );
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({
      secret: "s3cret",
      grantId: "grant-123",
      userAddress: "0xuser",
      scopes: ["chatgpt.conversations"],
    });
  });

  it("includes serverAddress in request body when provided", async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse({}));

    await approveSession("sess-1", {
      secret: "s3cret",
      grantId: "grant-123",
      userAddress: "0xuser",
      serverAddress: "0xserver",
      scopes: ["chatgpt.conversations"],
    });

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body).toEqual({
      secret: "s3cret",
      grantId: "grant-123",
      userAddress: "0xuser",
      serverAddress: "0xserver",
      scopes: ["chatgpt.conversations"],
    });
  });

  it("omits serverAddress from request body when not provided", async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse({}));

    await approveSession("sess-1", {
      secret: "s3cret",
      grantId: "grant-123",
      userAddress: "0xuser",
      scopes: ["chatgpt.conversations"],
    });

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.serverAddress).toBeUndefined();
  });

  it("URL-encodes the sessionId", async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse({}));

    await approveSession("sess/special&chars", {
      secret: "s",
      grantId: "g",
      userAddress: "0x",
      scopes: [],
    });

    const [url] = fetchSpy.mock.calls[0];
    expect(url).toContain("sess%2Fspecial%26chars");
  });

  it("throws SessionRelayError with SESSION_EXPIRED errorCode", async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonResponse(
        {
          error: {
            code: 410,
            errorCode: "SESSION_EXPIRED",
            message: "Session has expired",
          },
        },
        410
      )
    );

    await expect(
      approveSession("sess-1", {
        secret: "s",
        grantId: "g",
        userAddress: "0x",
        scopes: [],
      })
    ).rejects.toMatchObject({
      errorCode: "SESSION_EXPIRED",
      message: "Session has expired",
    });
  });
});

// --- denySession ---

describe("denySession", () => {
  it("sends POST to /v1/session/{id}/deny with reason", async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse({}));

    await denySession("sess-1", {
      secret: "s3cret",
      reason: "User declined",
    });

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://session-relay-git-dev-opendatalabs.vercel.app/v1/session/sess-1/deny");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({
      secret: "s3cret",
      reason: "User declined",
    });
  });

  it("sends deny without reason when omitted", async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse({}));

    await denySession("sess-1", { secret: "s3cret" });

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body).toEqual({ secret: "s3cret" });
    expect(body.reason).toBeUndefined();
  });

  it("throws on INVALID_SESSION_STATE", async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonResponse(
        {
          error: {
            code: 409,
            errorCode: "INVALID_SESSION_STATE",
            message: "Session already approved",
          },
        },
        409
      )
    );

    await expect(
      denySession("sess-1", { secret: "s" })
    ).rejects.toMatchObject({
      errorCode: "INVALID_SESSION_STATE",
    });
  });
});
