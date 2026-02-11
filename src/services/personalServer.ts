// Personal Server grant client
// Communicates with the locally-running Personal Server over localhost.
// The server creates grants (signs EIP-712 + submits to Gateway) and lists them.

export interface CreateGrantRequest {
  granteeAddress: string;
  scopes: string[];
  expiresAt?: string;
  nonce?: string;
}

export interface CreateGrantResponse {
  grantId: string;
}

export interface Grant {
  grantId: string;
  granteeAddress: string;
  scopes: string[];
  expiresAt?: string;
  revokedAt?: string;
  createdAt: string;
}

export class PersonalServerError extends Error {
  statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = "PersonalServerError";
    this.statusCode = statusCode;
  }
}

function baseUrl(port: number): string {
  return `http://localhost:${port}`;
}

async function serverFetch<T>(
  port: number,
  path: string,
  init: RequestInit
): Promise<T> {
  // Use Tauri HTTP plugin for localhost communication (bypasses CORS)
  const { fetch: tauriFetch } = await import("@tauri-apps/plugin-http");

  let response: Response;
  try {
    response = await tauriFetch(`${baseUrl(port)}${path}`, init);
  } catch {
    throw new PersonalServerError(
      "Failed to connect to Personal Server. Is it running?"
    );
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new PersonalServerError(
      `Personal Server returned non-JSON response (HTTP ${response.status})`,
      response.status
    );
  }

  if (!response.ok) {
    const message =
      typeof data === "object" && data !== null && "error" in data
        ? String((data as { error: string }).error)
        : `Personal Server request failed (HTTP ${response.status})`;
    throw new PersonalServerError(message, response.status);
  }

  return data as T;
}

export async function createGrant(
  port: number,
  request: CreateGrantRequest
): Promise<CreateGrantResponse> {
  return serverFetch<CreateGrantResponse>(port, "/v1/grants", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
}

export async function listGrants(
  port: number,
  devToken?: string | null
): Promise<Grant[]> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (devToken) {
    headers["Authorization"] = `Bearer ${devToken}`;
  }
  // The library's GET /v1/grants returns { grants: Grant[] }
  const data = await serverFetch<{ grants: Grant[] } | Grant[]>(
    port,
    "/v1/grants",
    { method: "GET", headers }
  );
  // Handle both envelope format ({ grants: [] }) and flat array
  return Array.isArray(data) ? data : data.grants;
}

export async function revokeGrant(
  port: number,
  grantId: string
): Promise<void> {
  const { fetch: tauriFetch } = await import("@tauri-apps/plugin-http");

  let response: Response;
  try {
    response = await tauriFetch(
      `${baseUrl(port)}/v1/grants/${encodeURIComponent(grantId)}`,
      { method: "DELETE", headers: { "Content-Type": "application/json" } }
    );
  } catch {
    throw new PersonalServerError(
      "Failed to connect to Personal Server. Is it running?"
    );
  }

  // 204 No Content is the success case
  if (response.status === 204 || response.ok) return;

  let message = `Personal Server request failed (HTTP ${response.status})`;
  try {
    const data = await response.json();
    if (typeof data === "object" && data !== null && "error" in data) {
      message = String((data as { error: string }).error);
    }
  } catch {
    // no JSON body — keep generic message
  }
  throw new PersonalServerError(message, response.status);
}
