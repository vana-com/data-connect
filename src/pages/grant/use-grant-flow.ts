import { useCallback, useEffect, useRef, useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"
import { useDispatch } from "react-redux"
import { useAuth } from "../../hooks/useAuth"
import { setAuthenticated, addConnectedApp } from "../../state/store"
import {
  claimSession,
  approveSession,
  denySession,
  SessionRelayError,
} from "../../services/sessionRelay"
import { verifyBuilder } from "../../services/builder"
import {
  createGrant,
  PersonalServerError,
} from "../../services/personalServer"
import { usePersonalServer } from "../../hooks/usePersonalServer"
import {
  savePendingApproval,
  clearPendingApproval,
} from "../../lib/storage"
import type {
  BuilderManifest,
  GrantFlowParams,
  GrantFlowState,
  GrantSession,
  PrefetchedGrantData,
} from "./types"
import { ROUTES } from "@/config/routes"

const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID
const PRIVY_CLIENT_ID = import.meta.env.VITE_PRIVY_CLIENT_ID
const DEV_AUTH_PAGE_URL = "http://localhost:5175"
const isTauriRuntime = () =>
  typeof window !== "undefined" && "__TAURI__" in window

// Demo mode: sessions starting with "grant-session-" use mock data (dev only)
function isDemoSession(sessionId: string): boolean {
  return import.meta.env.DEV && sessionId.startsWith("grant-session-")
}

function createDemoSession(sessionId: string): GrantSession {
  return {
    id: sessionId,
    granteeAddress: "0x0000000000000000000000000000000000000000",
    scopes: ["chatgpt.conversations"],
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    appName: "Demo App",
    appIcon: "🔗",
  }
}

function createDemoBuilderManifest(): BuilderManifest {
  return {
    name: "Demo App",
    description: "A demo application for testing the grant flow.",
    appUrl: "https://example.com",
    privacyPolicyUrl: "https://example.com/privacy",
    termsUrl: "https://example.com/terms",
    verified: true,
  }
}

export function useGrantFlow(params: GrantFlowParams, prefetched?: PrefetchedGrantData) {
  const dispatch = useDispatch()
  const { isAuthenticated, isLoading: authLoading, walletAddress } = useAuth()
  const personalServer = usePersonalServer()
  const [flowState, setFlowState] = useState<GrantFlowState>({
    sessionId: "",
    status: "loading",
  })
  const authTriggered = useRef(false)
  const [isApproving, setIsApproving] = useState(false)
  const [authPending, setAuthPending] = useState(false)
  const [authUrl, setAuthUrl] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)

  const sessionId = params?.sessionId
  const secret = params?.secret
  const hasSuccessOverride = params?.status === "success"

  // Reset auth state when sessionId changes
  useEffect(() => {
    authTriggered.current = false
    setAuthUrl(null)
    setAuthError(null)
    setAuthPending(false)
  }, [sessionId])

  // --- Main flow: load → claim → verify builder → consent ---
  useEffect(() => {
    if (!sessionId) {
      setFlowState({
        sessionId: "",
        status: "error",
        error: "No session ID provided. Please restart the flow from the app.",
      })
      return
    }

    const runFlow = async () => {
      setFlowState({ sessionId, secret, status: "loading" })

      // --- Demo mode ---
      if (isDemoSession(sessionId)) {
        const session = createDemoSession(sessionId)
        const builderManifest = createDemoBuilderManifest()
        setFlowState(prev => ({
          ...prev,
          status: "consent",
          session,
          builderManifest,
        }))

        return
      }

      // --- Pre-fetched path: connect page already claimed + verified in background ---
      if (prefetched?.session && prefetched?.builderManifest) {
        setFlowState(prev => ({
          ...prev,
          status: "consent",
          session: prefetched.session,
          builderManifest: prefetched.builderManifest,
        }))

        return
      }

      // --- Real flow (no pre-fetched data) ---
      if (!secret) {
        setFlowState({
          sessionId,
          status: "error",
          error:
            "No secret provided. The deep link URL is missing the secret parameter.",
        })
        return
      }

      // Step 1: Claim session
      try {
        setFlowState(prev => ({ ...prev, status: "claiming" }))
        const claimed = await claimSession({ sessionId, secret })
        const session: GrantSession = {
          id: sessionId,
          granteeAddress: claimed.granteeAddress,
          scopes: claimed.scopes,
          expiresAt: claimed.expiresAt,
          webhookUrl: claimed.webhookUrl,
          appUserId: claimed.appUserId,
        }
        setFlowState(prev => ({ ...prev, session }))

        // Step 2: Verify builder
        setFlowState(prev => ({ ...prev, status: "verifying-builder" }))
        let builderManifest: BuilderManifest
        try {
          builderManifest = await verifyBuilder(claimed.granteeAddress)
        } catch (err) {
          // Builder verification is non-fatal — use fallback metadata
          console.warn("[GrantFlow] Builder verification failed:", err)
          builderManifest = {
            name: `App ${claimed.granteeAddress.slice(0, 8)}…`,
            appUrl: "",
            verified: false,
          }
        }
        setFlowState(prev => ({ ...prev, builderManifest }))

        // Advance to consent (data export already completed on the connect page)
        setFlowState(prev => ({ ...prev, status: "consent" }))

      } catch (error) {
        setFlowState({
          sessionId,
          secret,
          status: "error",
          error:
            error instanceof SessionRelayError
              ? error.message
              : "Failed to load session",
        })
      }
    }

    runFlow()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- prefetched is stable from navigation state
  }, [sessionId, secret])

  // Handle success override (when returning from connect page)
  useEffect(() => {
    if (!hasSuccessOverride || !flowState.session) return
    if (flowState.status === "success") return
    setFlowState(prev => ({ ...prev, status: "success" }))
  }, [flowState.session, flowState.status, hasSuccessOverride])

  // --- Auth ---
  const startBrowserAuth = useCallback(async () => {
    if (import.meta.env.DEV && !isTauriRuntime()) {
      setAuthError(null)
      setAuthUrl(DEV_AUTH_PAGE_URL)
      return
    }
    if (!PRIVY_APP_ID || !PRIVY_CLIENT_ID) {
      setAuthError("Missing VITE_PRIVY_APP_ID or VITE_PRIVY_CLIENT_ID.")
      return
    }

    setAuthError(null)
    try {
      const url = await invoke<string>("start_browser_auth", {
        privyAppId: PRIVY_APP_ID,
        privyClientId: PRIVY_CLIENT_ID,
      })
      setAuthUrl(url)
    } catch (err) {
      if (import.meta.env.DEV) {
        setAuthUrl(null)
        setAuthError(
          `Auth dev server runs at ${DEV_AUTH_PAGE_URL}. Switch to that tab to continue.`
        )
        return
      }
      console.error("Failed to start browser auth:", err)
      setAuthError(
        err instanceof Error
          ? err.message
          : "Failed to open browser for authentication."
      )
      authTriggered.current = false
    }
  }, [])

  // Auto-start browser auth when auth is required
  useEffect(() => {
    if (flowState.status !== "auth-required" || authTriggered.current) return
    authTriggered.current = true
    startBrowserAuth()
  }, [flowState.status, startBrowserAuth])

  // Listen for auth completion from browser
  useEffect(() => {
    const unlisten = listen<{
      success: boolean
      user?: { id: string; email: string | null }
      walletAddress?: string
      masterKeySignature?: string
      error?: string
    }>("auth-complete", event => {
      const result = event.payload
      if (result.success && result.user) {
        dispatch(
          setAuthenticated({
            user: { id: result.user.id, email: result.user.email || undefined },
            walletAddress: result.walletAddress || null,
            masterKeySignature: result.masterKeySignature || null,
          })
        )
      }
    })
    return () => {
      unlisten.then(fn => fn())
    }
  }, [dispatch])

  // --- Approve flow ---
  const handleApprove = useCallback(async () => {
    if (!flowState.session) return

    // If not authenticated, defer to auth
    if (!isAuthenticated || !walletAddress) {
      setAuthPending(true)
      setFlowState(prev => ({ ...prev, status: "auth-required" }))
      return
    }

    setIsApproving(true)

    try {
      // Skip grant creation + session approval for demo sessions
      if (isDemoSession(flowState.sessionId)) {
        setFlowState(prev => ({ ...prev, status: "success" }))
        return
      }

      // Step: Create grant via Personal Server
      setFlowState(prev => ({ ...prev, status: "creating-grant" }))

      if (!personalServer.port) {
        throw new PersonalServerError(
          "Personal Server is not running. Please wait for it to start."
        )
      }

      const { grantId } = await createGrant(personalServer.port, {
        granteeAddress: flowState.session.granteeAddress,
        scopes: flowState.session.scopes,
        expiresAt: flowState.session.expiresAt,
      })

      setFlowState(prev => ({ ...prev, grantId }))

      // Step: Approve session via Session Relay
      setFlowState(prev => ({ ...prev, status: "approving" }))

      if (flowState.secret) {
        // Persist pending approval so we can retry if approve fails.
        // Without this, a split failure leaves the grant on Gateway
        // but the builder never learns about it.
        savePendingApproval({
          sessionId: flowState.sessionId,
          grantId,
          secret: flowState.secret,
          userAddress: walletAddress,
          scopes: flowState.session.scopes,
          createdAt: new Date().toISOString(),
        })

        await approveSession(flowState.sessionId, {
          secret: flowState.secret,
          grantId,
          userAddress: walletAddress,
          scopes: flowState.session.scopes,
        })

        clearPendingApproval()
      }

      // Persist as connected app in Redux for immediate UI update
      dispatch(
        addConnectedApp({
          id: grantId,
          name:
            flowState.builderManifest?.name ??
            flowState.session?.appName ??
            `App ${flowState.session.granteeAddress.slice(0, 6)}…${flowState.session.granteeAddress.slice(-4)}`,
          icon: flowState.builderManifest?.icons?.[0]?.src,
          permissions: flowState.session.scopes,
          connectedAt: new Date().toISOString(),
        })
      )

      setFlowState(prev => ({ ...prev, status: "success" }))
    } catch (error) {
      console.error("[GrantFlow] Approve failed:", error)
      setFlowState(prev => ({
        ...prev,
        status: "error",
        error:
          error instanceof SessionRelayError ||
          error instanceof PersonalServerError
            ? error.message
            : "Failed to complete the grant flow",
      }))
    } finally {
      setIsApproving(false)
    }
  }, [
    flowState.session,
    flowState.sessionId,
    flowState.secret,
    flowState.builderManifest,
    isAuthenticated,
    walletAddress,
    personalServer.port,
    dispatch,
  ])

  // Auto-approve after auth completes (if user had clicked Allow before auth)
  useEffect(() => {
    if (!authPending || !isAuthenticated || !walletAddress) return
    setAuthPending(false)
    void handleApprove()
  }, [authPending, handleApprove, isAuthenticated, walletAddress])

  // --- Deny flow ---
  const handleDeny = useCallback(async () => {
    if (!flowState.sessionId || !flowState.secret) return
    if (isDemoSession(flowState.sessionId)) return

    try {
      await denySession(flowState.sessionId, {
        secret: flowState.secret,
        reason: "User declined",
      })
    } catch (error) {
      // Deny failure is non-fatal — still navigate away
      console.warn("[GrantFlow] Deny call failed:", error)
    }

    setFlowState(prev => ({ ...prev, status: "denied" }))
  }, [flowState.sessionId, flowState.secret])

  // Helper to get display name from builder manifest or session legacy fields
  const builderName =
    flowState.builderManifest?.name ?? flowState.session?.appName ?? undefined

  const declineHref = ROUTES.apps

  return {
    flowState,
    isApproving,
    authUrl,
    authError,
    startBrowserAuth,
    handleApprove,
    handleDeny,
    declineHref,
    authLoading,
    walletAddress,
    builderName,
  }
}
