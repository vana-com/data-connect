import { useCallback } from "react"
import { useSelector } from "react-redux"

import type { IngestTarget } from "@/services/personalServerIngest"
import { useVanaLogin } from "@/hooks/useVanaLogin"
import type { RootState } from "@/state/store"

/**
 * Resolve the active IngestTarget based on appConfig.serverMode.
 *
 * - `local` mode: returns `{ kind: 'local', port }` for the running
 *   bundled PS. Caller passes the port from usePersonalServer().
 * - `remote` mode: returns `{ kind: 'remote', baseUrl, bearerToken }`
 *   using the configured remoteServerUrl + a fresh access token from
 *   useVanaLogin().ensureFreshAccessToken().
 *
 * Throws if remote mode is selected but configuration is incomplete
 * (no URL, not connected to Vana, refresh failed).
 */
export function useIngestTarget() {
  const appConfig = useSelector((state: RootState) => state.app.appConfig)
  const { ensureFreshAccessToken } = useVanaLogin()

  const resolve = useCallback(
    async (localPort: number | null): Promise<IngestTarget> => {
      if (appConfig.serverMode === "remote") {
        if (!appConfig.remoteServerUrl) {
          throw new Error(
            "Remote PS URL not set. Open Settings → Server mode and connect to Vana."
          )
        }
        const token = await ensureFreshAccessToken()
        return {
          kind: "remote",
          baseUrl: appConfig.remoteServerUrl,
          bearerToken: token,
        }
      }
      if (localPort == null) {
        throw new Error(
          "Local Personal Server is not running. Start it from Settings."
        )
      }
      return { kind: "local", port: localPort }
    },
    [appConfig, ensureFreshAccessToken]
  )

  return { resolve }
}
