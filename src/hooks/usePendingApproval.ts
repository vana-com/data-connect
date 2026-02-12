import { useEffect, useRef } from "react"
import { getPendingApproval, clearPendingApproval } from "../lib/storage"
import { approveSession } from "../services/sessionRelay"

/**
 * On app startup, checks for a pending session approval left over from a
 * split failure (grant created on Gateway, but session approve call failed).
 * If found, retries the approve call once, then clears the record regardless
 * of outcome — stale retries on expired sessions would loop forever.
 */
export function usePendingApprovalRetry() {
  const attempted = useRef(false)

  useEffect(() => {
    if (attempted.current) return
    attempted.current = true

    const pending = getPendingApproval()
    if (!pending) return

    const retry = async () => {
      try {
        await approveSession(pending.sessionId, {
          secret: pending.secret,
          grantId: pending.grantId,
          userAddress: pending.userAddress,
          ...(pending.serverAddress && { serverAddress: pending.serverAddress }),
          scopes: pending.scopes,
        })
        console.info(
          "[PendingApproval] Retried session approve successfully:",
          pending.sessionId
        )
      } catch (err) {
        // Session may have expired or already been handled — either way,
        // clear the pending record so we don't retry forever.
        console.warn(
          "[PendingApproval] Retry failed (clearing pending record):",
          err
        )
      } finally {
        clearPendingApproval()
      }
    }

    retry()
  }, [])
}
