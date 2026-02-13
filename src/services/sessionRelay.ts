// Session Relay v1 API client
// Endpoints: claim, approve, deny
// All calls require `secret` from deep link for authorization

const SESSION_RELAY_URL =
  import.meta.env.VITE_SESSION_RELAY_URL || "https://session-relay-git-dev-opendatalabs.vercel.app";

// --- Request/Response types ---

export interface ClaimSessionRequest {
  sessionId: string;
  secret: string;
}

export interface ClaimSessionResponse {
  sessionId: string;
  granteeAddress: string;
  scopes: string[];
  expiresAt: string;
  webhookUrl?: string;
  appUserId?: string;
}

export interface ApproveSessionRequest {
  secret: string;
  grantId: string;
  userAddress: string;
  serverAddress?: string;
  scopes: string[];
}

export interface DenySessionRequest {
  secret: string;
  reason?: string;
}

// --- Error types ---

export type SessionRelayErrorCode =
  | "SESSION_NOT_FOUND"
  | "SESSION_EXPIRED"
  | "INVALID_SESSION_STATE"
  | "INVALID_CLAIM_SECRET"
  | "VALIDATION_ERROR";

interface SessionRelayErrorBody {
  error: {
    code: number;
    errorCode: SessionRelayErrorCode;
    message: string;
    details?: unknown;
  };
}

export class SessionRelayError extends Error {
  errorCode?: SessionRelayErrorCode;
  statusCode?: number;

  constructor(
    message: string,
    errorCode?: SessionRelayErrorCode,
    statusCode?: number
  ) {
    super(message);
    this.name = "SessionRelayError";
    this.errorCode = errorCode;
    this.statusCode = statusCode;
  }
}

// --- Helpers ---

function parseErrorBody(data: unknown): SessionRelayErrorBody["error"] | null {
  if (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof (data as SessionRelayErrorBody).error === "object"
  ) {
    return (data as SessionRelayErrorBody).error;
  }
  return null;
}

async function relayFetch<T>(
  url: string,
  init: RequestInit
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    throw new SessionRelayError("Network error communicating with Session Relay");
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new SessionRelayError(
      `Session Relay returned non-JSON response (HTTP ${response.status})`
    );
  }

  if (!response.ok) {
    console.error("[SessionRelay] Non-OK response", { url, status: response.status, body: data });
    const errBody = parseErrorBody(data);
    if (errBody) {
      throw new SessionRelayError(
        errBody.message,
        errBody.errorCode,
        errBody.code
      );
    }
    throw new SessionRelayError(
      `Session Relay request failed (HTTP ${response.status})`
    );
  }

  return data as T;
}

// --- API functions ---

// Dedup concurrent claim calls for the same sessionId.
// A session can only be claimed once — concurrent calls (React StrictMode
// double-mount, Connect pre-fetch + Grant flow racing) share a single
// HTTP request to avoid 409 "already claimed" errors.
const claimInflight = new Map<string, Promise<ClaimSessionResponse>>();

/** @internal Reset claim dedup cache (for testing). */
export function _resetClaimCache() {
  claimInflight.clear();
}

export async function claimSession(
  request: ClaimSessionRequest
): Promise<ClaimSessionResponse> {
  const existing = claimInflight.get(request.sessionId);
  if (existing) {
    console.log("[SessionRelay] claimSession deduped (in-flight)", { sessionId: request.sessionId });
    return existing;
  }

  console.log("[SessionRelay] claimSession called", { sessionId: request.sessionId });
  const promise = relayFetch<ClaimSessionResponse>(
    `${SESSION_RELAY_URL}/v1/session/claim`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    }
  );

  claimInflight.set(request.sessionId, promise);

  // Keep successful results cached (claim is idempotent for the session lifetime).
  // Clear failures so retries can make a fresh request.
  promise.catch(() => {
    claimInflight.delete(request.sessionId);
  });

  return promise;
}

export async function approveSession(
  sessionId: string,
  request: ApproveSessionRequest
): Promise<void> {
  await relayFetch<unknown>(
    `${SESSION_RELAY_URL}/v1/session/${encodeURIComponent(sessionId)}/approve`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    }
  );
}

export async function denySession(
  sessionId: string,
  request: DenySessionRequest
): Promise<void> {
  await relayFetch<unknown>(
    `${SESSION_RELAY_URL}/v1/session/${encodeURIComponent(sessionId)}/deny`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    }
  );
}
