import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"
import { useDispatch } from "react-redux"
import { useAuth } from "../../hooks/useAuth"
import { setAuthenticated } from "../../state/store"
import { denySession } from "../../services/sessionRelay"
import { usePersonalServer } from "../../hooks/usePersonalServer"
import type {
  BuilderManifest,
  GrantFlowParams,
  GrantFlowState,
  GrantFlowStatus,
  GrantSession,
  PrefetchedGrantData,
} from "./types"
import { ROUTES } from "@/config/routes"
import { createInitialGrantFlowState, reduceGrantFlowState } from "./grant-flow-machine"
import { runGrantFlowBootstrap } from "./grant-flow-bootstrap"
import {
  mapGrantApprovalError,
  runGrantApprovalPipeline,
} from "./grant-flow-approval"
import {
  resolveAuthResumeGate,
  resolveInitialApprovalGate,
} from "./grant-flow-auth-bridge"
import { saveAuthSession } from "../../services/auth-session"

const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID
const PRIVY_CLIENT_ID = import.meta.env.VITE_PRIVY_CLIENT_ID
const DEV_AUTH_PAGE_URL = "http://localhost:5175"
const isTauriRuntime = () =>
  typeof window !== "undefined" &&
  ("__TAURI__" in window || "__TAURI_INTERNALS__" in window)

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
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { isAuthenticated, isLoading: authLoading, walletAddress } = useAuth()
  const personalServer = usePersonalServer()
  const [flowState, setFlowState] = useState<GrantFlowState>(createInitialGrantFlowState())
  const authTriggered = useRef(false)
  const [isApproving, setIsApproving] = useState(false)
  const [authPending, setAuthPending] = useState(false)
  const [authUrl, setAuthUrl] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const sessionId = params?.sessionId
  const secret = params?.secret
  const hasSuccessOverride = params?.status === "success"
  const dispatchFlow = useCallback((action: Parameters<typeof reduceGrantFlowState>[1]) => {
    setFlowState(prev => reduceGrantFlowState(prev, action))
  }, [])
  const transitionFlow = useCallback((status: GrantFlowStatus) => {
    dispatchFlow({ type: "transition", status })
  }, [dispatchFlow])

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
      dispatchFlow({
        type: "fail",
        sessionId: "",
        error: "No session ID provided. Please restart the flow from the app.",
      })
      return
    }

    // Guard against stale async updates from React StrictMode double-mount.
    // When StrictMode unmounts the first instance, cleanup sets cancelled=true
    // so the first mount's in-flight async ops don't clobber the second mount's state.
    let cancelled = false

    const runFlow = async () => {
      await runGrantFlowBootstrap({
        sessionId,
        secret,
        prefetched,
        isCancelled: () => cancelled,
        dispatchFlow,
        transitionFlow,
        isDemoSession,
        createDemoSession,
        createDemoBuilderManifest,
      })
    }

    runFlow()

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- prefetched is stable from navigation state
  }, [sessionId, secret, retryCount, prefetched, dispatchFlow, transitionFlow])

  // Handle success override (when returning from connect page)
  useEffect(() => {
    if (!hasSuccessOverride || !flowState.session) return
    if (flowState.status === "success") return
    transitionFlow("success")
  }, [flowState.session, flowState.status, hasSuccessOverride, transitionFlow])

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
        const session = {
          user: { id: result.user.id, email: result.user.email || undefined },
          walletAddress: result.walletAddress || null,
          masterKeySignature: result.masterKeySignature || null,
        }
        dispatch(
          setAuthenticated({
            user: session.user,
            walletAddress: session.walletAddress,
            masterKeySignature: session.masterKeySignature,
          })
        )
        void saveAuthSession(session)
      }
    })
    return () => {
      unlisten.then(fn => fn())
    }
  }, [dispatch])

  // --- Approve flow ---
  const handleApprove = useCallback(async () => {
    if (!flowState.session) return

    const initialGate = resolveInitialApprovalGate({
      isAuthenticated,
      walletAddress,
      personalServerPort: personalServer.port,
      personalServerTunnelUrl: personalServer.tunnelUrl,
    })

    if (initialGate.type !== "ready") {
      setAuthPending(true)
      transitionFlow(initialGate.status)
      return
    }

    setIsApproving(true)

    try {
      await runGrantApprovalPipeline({
        flowState,
        walletAddress: initialGate.walletAddress,
        personalServer: {
          port: initialGate.personalServerPort,
          devToken: personalServer.devToken,
        },
        dispatch,
        dispatchFlow,
        transitionFlow,
        isDemoSession,
      })
    } catch (error) {
      console.error("[GrantFlow] Approve failed:", error)
      dispatchFlow({
        type: "fail",
        sessionId: flowState.sessionId,
        secret: flowState.secret,
        error: mapGrantApprovalError(error),
      })
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
    personalServer.tunnelUrl,
    personalServer.devToken,
    dispatch,
  ])

  // Auto-approve after auth completes (if user had clicked Allow before auth).
  // For non-demo sessions, wait until the Personal Server is fully ready
  // (port + tunnel) so handleApprove doesn't throw and the builder can reach
  // the server externally. If the server errors out, surface the error
  // immediately. For tunnel failures, keep waiting — the backend monitors
  // frpc asynchronously and may emit a late tunnel-success event.
  const preparingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [tunnelTimedOut, setTunnelTimedOut] = useState(false)

  // Start a timeout when entering "preparing-server" — give the tunnel up
  // to 90s before declaring failure. This covers fresh installs where frpc
  // needs time to download/connect.
  useEffect(() => {
    if (flowState.status === "preparing-server" && !preparingTimerRef.current) {
      preparingTimerRef.current = setTimeout(() => {
        setTunnelTimedOut(true)
      }, 90_000)
    }
    if (flowState.status !== "preparing-server" && preparingTimerRef.current) {
      clearTimeout(preparingTimerRef.current)
      preparingTimerRef.current = null
      setTunnelTimedOut(false)
    }
    return () => {
      if (preparingTimerRef.current) {
        clearTimeout(preparingTimerRef.current)
        preparingTimerRef.current = null
      }
    }
  }, [flowState.status])

  useEffect(() => {
    const gateResult = resolveAuthResumeGate({
      authPending,
      isAuthenticated,
      walletAddress,
      personalServerStatus: personalServer.status,
      personalServerError: personalServer.error,
      personalServerPort: personalServer.port,
      personalServerTunnelUrl: personalServer.tunnelUrl,
      personalServerRestarting: personalServer.restartingRef.current,
      tunnelTimedOut,
      isDemoSession: isDemoSession(flowState.sessionId),
      sessionId: flowState.sessionId,
      secret: flowState.secret,
    })

    if (gateResult.type === "noop") return

    if (gateResult.type === "fail") {
      setAuthPending(false)
      dispatchFlow(gateResult.action)
      return
    }

    if (gateResult.type === "wait") {
      transitionFlow(gateResult.status)
      return
    }

    setAuthPending(false)
    void handleApprove()
  }, [authPending, handleApprove, isAuthenticated, walletAddress, personalServer.port, personalServer.tunnelUrl, tunnelTimedOut, personalServer.status, personalServer.error, flowState.sessionId, flowState.secret, dispatchFlow, transitionFlow])

  // --- Retry from error ---
  // Bumps retryCount which re-triggers the main flow effect (claim → verify → consent).
  // For errors during grant creation/approval, the user returns to consent
  // and can click Allow again.
  const handleRetry = useCallback(() => {
    authTriggered.current = false
    setAuthPending(false)
    setRetryCount(c => c + 1)
  }, [])

  // --- Deny flow ---
  // Fire-and-forget the deny call, then navigate away immediately.
  // The user clicked Cancel — they don't need to see a confirmation screen.
  const handleDeny = useCallback(async () => {
    if (flowState.sessionId && flowState.secret && !isDemoSession(flowState.sessionId)) {
      try {
        await denySession(flowState.sessionId, {
          secret: flowState.secret,
          reason: "User declined",
        })
      } catch (error) {
        // Deny failure is non-fatal — still navigate away
        console.warn("[GrantFlow] Deny call failed:", error)
      }
    }

    navigate(ROUTES.apps)
  }, [flowState.sessionId, flowState.secret, navigate])

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
    handleRetry,
    declineHref,
    authLoading,
    walletAddress,
    builderName,
  }
}
