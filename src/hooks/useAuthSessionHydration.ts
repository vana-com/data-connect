import { useEffect } from "react"
import { useDispatch } from "react-redux"
import { setAuthenticated, setAuthLoading } from "../state/store"
import { loadAuthSession } from "../services/auth-session"

export function useAuthSessionHydration() {
  const dispatch = useDispatch()

  useEffect(() => {
    let cancelled = false

    const hydrate = async () => {
      try {
        const session = await loadAuthSession()
        if (!session || cancelled) return

        dispatch(
          setAuthenticated({
            user: session.user,
            walletAddress: session.walletAddress,
            masterKeySignature: session.masterKeySignature,
          }),
        )
      } catch (error) {
        console.warn("[AuthSession] Hydration failed:", error)
      } finally {
        if (!cancelled) {
          dispatch(setAuthLoading(false))
        }
      }
    }

    void hydrate()

    return () => {
      cancelled = true
    }
  }, [dispatch])
}
