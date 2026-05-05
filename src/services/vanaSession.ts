/**
 * Vana session lifecycle for data-connect.
 *
 * "Connect with Vana" drives the OAuth2 device-code flow against Hydra:
 *   1. POST {hydraPublic}/oauth2/device/auth (RFC 8628) →
 *      { device_code, user_code, verification_uri_complete, interval, expires_in }.
 *   2. Open the verification URL in the user's browser (Tauri shell-open).
 *   3. Poll {hydraPublic}/oauth2/token with grant_type=device_code.
 *   4. On success, store the access + refresh tokens and call
 *      account.vana.org/api/servers (Bearer) to discover the user's
 *      personal_servers.url, which becomes remoteServerUrl.
 *
 * Refresh: refreshAccessToken trades the refresh token for a new access
 * token (and rotated refresh token).
 *
 * Storage: tokens are persisted in Redux's appConfig.vanaAccessToken /
 * vanaRefreshToken / vanaAccessTokenExpiresAt for now. A follow-up
 * should move to Tauri Stronghold or OS keychain for production.
 */

import { fetch as tauriFetch } from "@tauri-apps/plugin-http"

const HYDRA_PUBLIC_URL =
  import.meta.env.VITE_HYDRA_PUBLIC_URL || "https://oauth-dev.vana.org"
const ACCOUNT_URL =
  import.meta.env.VITE_ACCOUNT_URL || "https://account-dev.vana.org"
const DATA_CONNECT_CLIENT_ID =
  import.meta.env.VITE_HYDRA_DATA_CONNECT_CLIENT_ID || "data-connect"
// Default scope. The 'offline' scope is required for Hydra to return a
// refresh token. 'openid' triggers an id_token in the response too, useful
// for downstream surfaces.
const DEFAULT_SCOPE = "openid offline"

export type DeviceAuthorization = {
  device_code: string
  user_code: string
  verification_uri: string
  verification_uri_complete?: string
  expires_in: number
  interval: number
}

export type VanaTokenBundle = {
  access_token: string
  refresh_token?: string
  id_token?: string
  expires_in: number
  token_type: string
  scope?: string
}

export class VanaDeviceFlowError extends Error {
  readonly code: string
  readonly status?: number
  constructor(code: string, message: string, status?: number) {
    super(message)
    this.name = "VanaDeviceFlowError"
    this.code = code
    this.status = status
  }
}

/**
 * Step 1: request a device code from Hydra. Returns the user_code +
 * verification_uri_complete that the caller should display + open.
 */
export async function startDeviceAuthorization(opts?: {
  scope?: string
  audience?: string[]
}): Promise<DeviceAuthorization> {
  const body = new URLSearchParams()
  body.set("client_id", DATA_CONNECT_CLIENT_ID)
  body.set("scope", opts?.scope ?? DEFAULT_SCOPE)
  if (opts?.audience && opts.audience.length > 0) {
    body.set("audience", opts.audience.join(" "))
  }
  const res = await tauriFetch(
    `${HYDRA_PUBLIC_URL.replace(/\/+$/, "")}/oauth2/device/auth`,
    {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        accept: "application/json",
      },
      body: body.toString(),
    }
  )
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new VanaDeviceFlowError(
      "device_auth_failed",
      `Hydra /oauth2/device/auth returned ${res.status}: ${text}`,
      res.status
    )
  }
  return (await res.json()) as DeviceAuthorization
}

/**
 * Step 3: poll Hydra's token endpoint until the user approves or the
 * device_code expires. Respects the per-RFC-8628 polling interval and
 * `slow_down` responses (which extend the interval by 5s).
 *
 * Resolves with the token bundle on success, throws on terminal failure.
 */
export async function pollForTokens(input: {
  deviceCode: string
  initialIntervalSeconds: number
  expiresInSeconds: number
  /** Called between polls so callers can react to user-facing state. */
  onTick?: (info: { status: "pending"; secondsRemaining: number }) => void
  /** Override for tests — the global default is `Date.now`. */
  now?: () => number
}): Promise<VanaTokenBundle> {
  const now = input.now ?? (() => Date.now())
  const start = now()
  const expiresAtMs = start + input.expiresInSeconds * 1000
  let intervalMs = input.initialIntervalSeconds * 1000

  while (true) {
    if (now() > expiresAtMs) {
      throw new VanaDeviceFlowError(
        "expired",
        "Device authorization expired before approval"
      )
    }

    const body = new URLSearchParams()
    body.set("grant_type", "urn:ietf:params:oauth:grant-type:device_code")
    body.set("device_code", input.deviceCode)
    body.set("client_id", DATA_CONNECT_CLIENT_ID)
    const res = await tauriFetch(
      `${HYDRA_PUBLIC_URL.replace(/\/+$/, "")}/oauth2/token`,
      {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          accept: "application/json",
        },
        body: body.toString(),
      }
    )
    if (res.ok) {
      return (await res.json()) as VanaTokenBundle
    }
    const errorBody = (await res.json().catch(() => ({}))) as {
      error?: string
      error_description?: string
    }
    const errCode = errorBody.error ?? "unknown_error"
    if (errCode === "authorization_pending") {
      // continue polling
    } else if (errCode === "slow_down") {
      intervalMs += 5_000
    } else if (
      errCode === "expired_token" ||
      errCode === "access_denied" ||
      errCode === "invalid_grant"
    ) {
      throw new VanaDeviceFlowError(
        errCode,
        errorBody.error_description ?? errCode
      )
    } else {
      throw new VanaDeviceFlowError(
        errCode,
        errorBody.error_description ?? `Hydra returned ${res.status}`,
        res.status
      )
    }

    input.onTick?.({
      status: "pending",
      secondsRemaining: Math.max(
        0,
        Math.floor((expiresAtMs - now()) / 1000)
      ),
    })
    await new Promise((r) => setTimeout(r, intervalMs))
  }
}

/**
 * Refresh an expired access token using the refresh token. Hydra rotates
 * refresh tokens by default; callers MUST persist the new refresh_token
 * in place of the old one.
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<VanaTokenBundle> {
  const body = new URLSearchParams()
  body.set("grant_type", "refresh_token")
  body.set("refresh_token", refreshToken)
  body.set("client_id", DATA_CONNECT_CLIENT_ID)
  const res = await tauriFetch(
    `${HYDRA_PUBLIC_URL.replace(/\/+$/, "")}/oauth2/token`,
    {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        accept: "application/json",
      },
      body: body.toString(),
    }
  )
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new VanaDeviceFlowError(
      "refresh_failed",
      `Refresh failed (${res.status}): ${text}`,
      res.status
    )
  }
  return (await res.json()) as VanaTokenBundle
}

/**
 * After a successful Login with Vana, discover the user's PS URL by
 * querying account.vana.org's /api/servers with the access token.
 * Returns the URL of the user's running PS, or null if none.
 */
export async function discoverUserPersonalServer(
  accessToken: string
): Promise<{ id: string; url: string } | null> {
  const res = await tauriFetch(
    `${ACCOUNT_URL.replace(/\/+$/, "")}/api/servers`,
    {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${accessToken}`,
      },
    }
  )
  if (!res.ok) {
    throw new VanaDeviceFlowError(
      "server_discovery_failed",
      `account.vana.org /api/servers returned ${res.status}`,
      res.status
    )
  }
  const body = (await res.json()) as {
    data?: Array<{ id: string; url: string | null; state?: string }>
  }
  const servers = body.data ?? []
  const running =
    servers.find((s) => s.state === "running" && s.url) ??
    servers.find((s) => s.url)
  if (!running || !running.url) return null
  return { id: running.id, url: running.url }
}

/**
 * Compute the absolute expiry timestamp (unix seconds) from a token
 * response. Used to populate AppConfig.vanaAccessTokenExpiresAt so the
 * UI knows when to refresh proactively.
 */
export function computeAccessTokenExpiresAt(
  expiresInSeconds: number,
  now: () => number = () => Math.floor(Date.now() / 1000)
): number {
  return now() + expiresInSeconds
}
