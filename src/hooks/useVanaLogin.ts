import { invoke } from "@tauri-apps/api/core"
import { useCallback, useState } from "react"
import { useDispatch, useSelector } from "react-redux"

import {
  type DeviceAuthorization,
  computeAccessTokenExpiresAt,
  discoverUserPersonalServer,
  pollForTokens,
  refreshAccessToken,
  startDeviceAuthorization,
  VanaDeviceFlowError,
  type VanaTokenBundle,
} from "@/services/vanaSession"
import { setAppConfig } from "@/state/store"
import type { RootState } from "@/state/store"

/**
 * "Connect with Vana" hook — drives the Hydra device-code flow for
 * data-connect.
 *
 * Lifecycle:
 *   - Caller calls connect(): we request a device code, open the
 *     verification URL via Tauri shell, and start polling.
 *   - On success, we persist the tokens to Redux's appConfig and
 *     auto-discover the user's PS URL via account.vana.org/api/servers.
 *     Settings UI flips serverMode to 'remote' + remoteServerUrl
 *     populated.
 *   - On failure, we surface the error and clear pending state.
 *
 * Token refresh: ensureFreshAccessToken() trades the refresh token for
 * a new access token if the current one is within `refreshSafetyWindow`
 * seconds of expiry. Returns the (possibly refreshed) bearer.
 */
export function useVanaLogin() {
  const dispatch = useDispatch()
  const appConfig = useSelector((state: RootState) => state.app.appConfig)

  const [pending, setPending] = useState<DeviceAuthorization | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const persistTokens = useCallback(
    (tokens: VanaTokenBundle) => {
      dispatch(
        setAppConfig({
          vanaAccessToken: tokens.access_token,
          vanaRefreshToken: tokens.refresh_token,
          vanaAccessTokenExpiresAt: computeAccessTokenExpiresAt(
            tokens.expires_in
          ),
        })
      )
    },
    [dispatch]
  )

  const connect = useCallback(async () => {
    setError(null)
    setBusy(true)
    try {
      const auth = await startDeviceAuthorization()
      setPending(auth)

      // Open the verification URL in the user's default browser.
      const url = auth.verification_uri_complete ?? auth.verification_uri
      try {
        await invoke("plugin:opener|open_url", { url })
      } catch {
        // Tauri opener plugin may not be loaded in dev; surface the URL
        // via state so the UI can render a manual-open fallback.
      }

      const tokens = await pollForTokens({
        deviceCode: auth.device_code,
        initialIntervalSeconds: auth.interval,
        expiresInSeconds: auth.expires_in,
      })
      persistTokens(tokens)

      // Auto-discover PS URL.
      try {
        const ps = await discoverUserPersonalServer(tokens.access_token)
        if (ps?.url) {
          dispatch(
            setAppConfig({
              serverMode: "remote",
              remoteServerUrl: ps.url,
            })
          )
        }
      } catch {
        // Discovery failure isn't fatal — the user can paste the PS URL
        // manually in Settings. Surface via console.
        console.warn("[vana-login] PS auto-discovery failed")
      }

      setPending(null)
    } catch (err) {
      const msg =
        err instanceof VanaDeviceFlowError
          ? `${err.code}: ${err.message}`
          : err instanceof Error
            ? err.message
            : String(err)
      setError(msg)
      setPending(null)
    } finally {
      setBusy(false)
    }
  }, [persistTokens, dispatch])

  /**
   * Returns a fresh access token, refreshing if necessary. Throws if no
   * refresh token is available or the refresh fails.
   */
  const ensureFreshAccessToken = useCallback(
    async (refreshSafetyWindowSeconds = 60): Promise<string> => {
      const access = appConfig.vanaAccessToken
      const expiresAt = appConfig.vanaAccessTokenExpiresAt ?? 0
      const refresh = appConfig.vanaRefreshToken
      const now = Math.floor(Date.now() / 1000)
      if (access && expiresAt > now + refreshSafetyWindowSeconds) {
        return access
      }
      if (!refresh) {
        throw new VanaDeviceFlowError(
          "no_refresh_token",
          "No refresh token; user must Connect with Vana"
        )
      }
      const tokens = await refreshAccessToken(refresh)
      persistTokens(tokens)
      return tokens.access_token
    },
    [appConfig, persistTokens]
  )

  const disconnect = useCallback(() => {
    dispatch(
      setAppConfig({
        vanaAccessToken: undefined,
        vanaRefreshToken: undefined,
        vanaAccessTokenExpiresAt: undefined,
        // Don't auto-flip back to local; keep remoteServerUrl so the user
        // can re-Connect without re-typing.
      })
    )
  }, [dispatch])

  return {
    pending,
    error,
    busy,
    /** Has a refresh token been stored? */
    isConnected: Boolean(appConfig.vanaRefreshToken),
    connect,
    disconnect,
    ensureFreshAccessToken,
  }
}
