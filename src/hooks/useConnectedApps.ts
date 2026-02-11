import { useCallback } from "react"
import { useDispatch, useSelector } from "react-redux"
import { setConnectedApps, removeConnectedApp as removeConnectedAppAction } from "../state/store"
import { listGrants, revokeGrant } from "../services/personalServer"
import type { Grant } from "../services/personalServer"
import type { ConnectedApp, RootState } from "../types"

/**
 * Converts a Grant (from the Personal Server / Gateway) into a ConnectedApp
 * for display in the UI. The grant is the source of truth; we derive display
 * fields from its data.
 */
function grantToConnectedApp(grant: Grant): ConnectedApp {
  return {
    id: grant.grantId,
    name: `App ${grant.granteeAddress.slice(0, 6)}…${grant.granteeAddress.slice(-4)}`,
    permissions: grant.scopes,
    connectedAt: grant.createdAt,
  }
}

/**
 * Hook that fetches connected apps (grants) from the Personal Server and
 * keeps Redux in sync. The Personal Server's GET /v1/grants proxies the
 * Gateway, making it the single source of truth for granted permissions.
 *
 * Replaces the old localStorage-based storage approach.
 */
export function useConnectedApps() {
  const dispatch = useDispatch()
  const connectedApps = useSelector(
    (state: RootState) => state.app.connectedApps
  )
  const isAuthenticated = useSelector(
    (state: RootState) => state.app.auth.isAuthenticated
  )

  const fetchConnectedApps = useCallback(
    async (port: number | null) => {
      if (!port || !isAuthenticated) return

      try {
        const grants = await listGrants(port)
        // Filter out revoked grants
        const activeGrants = grants.filter((g) => !g.revokedAt)
        const apps = activeGrants.map(grantToConnectedApp)
        dispatch(setConnectedApps(apps))
      } catch (error) {
        console.warn("[useConnectedApps] Failed to fetch grants:", error)
      }
    },
    [dispatch, isAuthenticated]
  )

  const removeApp = useCallback(
    async (appId: string, port: number | null) => {
      // Optimistically remove from Redux so UI updates immediately
      dispatch(removeConnectedAppAction(appId))

      if (port) {
        try {
          await revokeGrant(port, appId)
        } catch (error) {
          console.warn("[useConnectedApps] Failed to revoke grant on server:", error)
        }
      }
    },
    [dispatch]
  )

  return {
    connectedApps,
    fetchConnectedApps,
    removeApp,
  }
}
