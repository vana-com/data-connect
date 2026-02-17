import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
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
import { verifyBuilder, BuilderVerificationError } from "../../services/builder"
import {
  createGrant,
  PersonalServerError,
} from "../../services/personalServer"
import { fetchServerIdentity } from "../../services/serverRegistration"
import { usePersonalServer } from "../../hooks/usePersonalServer"
import {
  savePendingApproval,
  clearPendingApproval,
} from "../../lib/storage"
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
      console.log("[GrantFlow] runFlow starting", {
        sessionId,
        hasSecret: Boolean(secret),
        hasPrefetched: Boolean(prefetched),
        prefetchedSessionId: prefetched?.session?.id,
        prefetchedHasBuilder: Boolean(prefetched?.builderManifest),
        isDemoSession: isDemoSession(sessionId),
      });
      dispatchFlow({ type: "start", sessionId, secret })

      // --- Demo mode ---
      if (isDemoSession(sessionId)) {
        const session = createDemoSession(sessionId)
        const builderManifest = createDemoBuilderManifest()
        dispatchFlow({ type: "set-session", session })
        dispatchFlow({ type: "set-builder-manifest", builderManifest })
        transitionFlow("consent")

        return
      }

      // --- Pre-fetched path: connect page already claimed + verified in background ---
      if (prefetched?.session && prefetched?.builderManifest) {
        console.log("[GrantFlow] Using pre-fetched data (skipping claim + verify)", {
          sessionId: prefetched.session.id,
          builderName: prefetched.builderManifest.name,
        });
        dispatchFlow({ type: "set-session", session: prefetched.session })
        dispatchFlow({ type: "set-builder-manifest", builderManifest: prefetched.builderManifest })
        transitionFlow("consent")

        return
      }

      // --- Pre-fetched session only: claim done, builder verification still needed ---
      if (prefetched?.session) {
        console.log("[GrantFlow] Using pre-fetched session (skipping claim, verifying builder)", {
          sessionId: prefetched.session.id,
        });
        dispatchFlow({ type: "set-session", session: prefetched.session })

        try {
          transitionFlow("verifying-builder")
          const builderManifest = await verifyBuilder(
            prefetched.session.granteeAddress,
            prefetched.session.webhookUrl,
          )
          if (cancelled) return
          dispatchFlow({ type: "set-builder-manifest", builderManifest })
          transitionFlow("consent")
        } catch (error) {
          if (cancelled) return
          console.error("[GrantFlow] Builder verification failed (pre-fetched session)", {
            sessionId: prefetched.session.id,
            message: error instanceof Error ? error.message : String(error),
          });
          dispatchFlow({
            type: "fail",
            sessionId,
            secret,
            error:
              error instanceof BuilderVerificationError
                ? error.message
                : "Failed to verify builder",
          })
        }

        return
      }

      // --- Real flow (no pre-fetched data) ---
      if (!secret) {
        dispatchFlow({
          type: "fail",
          sessionId,
          error:
            "No secret provided. The deep link URL is missing the secret parameter.",
        })
        return
      }

      // Step 1: Claim session
      try {
        console.log("[GrantFlow] Falling back to fresh claim (no pre-fetched data)", { sessionId });
        transitionFlow("claiming")
        const claimed = await claimSession({ sessionId, secret })
        if (cancelled) return
        const session: GrantSession = {
          id: sessionId,
          granteeAddress: claimed.granteeAddress,
          scopes: claimed.scopes,
          expiresAt: claimed.expiresAt,
          webhookUrl: claimed.webhookUrl,
          appUserId: claimed.appUserId,
        }
        console.log("[GrantFlow] Claim succeeded", {
          sessionId,
          granteeAddress: claimed.granteeAddress,
          scopes: claimed.scopes,
        });
        dispatchFlow({ type: "set-session", session })

        // Step 2: Verify builder
        // Protocol spec: "If manifest discovery or signature verification fails,
        // the Desktop App MUST NOT render the consent screen and MUST fail the session flow."
        transitionFlow("verifying-builder")
        const builderManifest = await verifyBuilder(
          claimed.granteeAddress,
          claimed.webhookUrl,
        )
        if (cancelled) return
        dispatchFlow({ type: "set-builder-manifest", builderManifest })

        // Advance to consent (data export already completed on the connect page)
        transitionFlow("consent")

      } catch (error) {
        if (cancelled) return
        console.error("[GrantFlow] Flow error", {
          sessionId,
          errorType: error instanceof SessionRelayError ? "SessionRelayError" : error instanceof BuilderVerificationError ? "BuilderVerificationError" : "unknown",
          message: error instanceof Error ? error.message : String(error),
          ...(error instanceof SessionRelayError && {
            errorCode: error.errorCode,
            statusCode: error.statusCode,
          }),
        });
        dispatchFlow({
          type: "fail",
          sessionId,
          secret,
          error:
            error instanceof SessionRelayError ||
            error instanceof BuilderVerificationError
              ? error.message
              : "Failed to load session",
        })
      }
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

    // If not authenticated, defer to auth (auto-approve effect will resume)
    if (!isAuthenticated || !walletAddress) {
      setAuthPending(true)
      transitionFlow("auth-required")
      return
    }

    // If Personal Server isn't fully ready yet (port + tunnel), defer.
    // The auto-approve effect will resume once both are available.
    // The tunnel is required so the builder app can reach the server externally.
    if (!personalServer.port || !personalServer.tunnelUrl) {
      setAuthPending(true)
      transitionFlow("creating-grant")
      return
    }

    setIsApproving(true)

    try {
      // Skip grant creation + session approval for demo sessions
      if (isDemoSession(flowState.sessionId)) {
        transitionFlow("success")
        return
      }

      // Check session expiry before proceeding — better UX than waiting
      // for the server to reject the request.
      if (flowState.session.expiresAt) {
        const expiresAt = new Date(flowState.session.expiresAt).getTime()
        if (!Number.isNaN(expiresAt) && Date.now() > expiresAt) {
          throw new SessionRelayError(
            "This session has expired. Please start a new request from the app.",
          )
        }
      }

      // Step: Create grant via Personal Server
      transitionFlow("creating-grant")

      const expiresAtNum = flowState.session.expiresAt
        ? Math.floor(new Date(flowState.session.expiresAt).getTime() / 1000)
        : undefined

      const { grantId } = await createGrant(personalServer.port, {
        granteeAddress: flowState.session.granteeAddress,
        scopes: flowState.session.scopes,
        expiresAt: expiresAtNum,
      }, personalServer.devToken)

      dispatchFlow({ type: "set-grant-id", grantId })

      // Fetch the Personal Server's own address so the builder can resolve
      // the server via Gateway (registered under this address, not the user's).
      const { address: serverAddress } = await fetchServerIdentity(personalServer.port)

      // Step: Approve session via Session Relay
      transitionFlow("approving")

      if (!flowState.secret) {
        throw new SessionRelayError(
          "Cannot approve session: secret is missing from the flow state. " +
          "The builder will not be notified of this grant.",
        )
      }

      // Persist pending approval so we can retry if approve fails.
      // Without this, a split failure leaves the grant on Gateway
      // but the builder never learns about it.
      savePendingApproval({
        sessionId: flowState.sessionId,
        grantId,
        secret: flowState.secret,
        userAddress: walletAddress,
        serverAddress,
        scopes: flowState.session.scopes,
        createdAt: new Date().toISOString(),
      })

      await approveSession(flowState.sessionId, {
        secret: flowState.secret,
        grantId,
        userAddress: walletAddress,
        serverAddress,
        scopes: flowState.session.scopes,
      })

      clearPendingApproval()

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

      transitionFlow("success")
    } catch (error) {
      console.error("[GrantFlow] Approve failed:", error)
      dispatchFlow({
        type: "fail",
        sessionId: flowState.sessionId,
        secret: flowState.secret,
        error:
          error instanceof SessionRelayError ||
          error instanceof PersonalServerError
            ? error.message
            : "Failed to complete the grant flow",
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
    if (!authPending || !isAuthenticated || !walletAddress) return
    if (personalServer.status === "error") {
      setAuthPending(false)
      dispatchFlow({
        type: "fail",
        sessionId: flowState.sessionId,
        secret: flowState.secret,
        error: personalServer.error || "Personal Server failed to start.",
      })
      return
    }
    const isDemo = isDemoSession(flowState.sessionId)
    // During Phase 2 restart, wait for the server to come back up.
    // restartingRef is set synchronously during render so we see it
    // before any stale tunnelFailed state from Phase 1.
    if (!isDemo && personalServer.restartingRef.current) {
      transitionFlow("preparing-server")
      return
    }
    // If the tunnel timed out (90s), surface the error.
    if (tunnelTimedOut) {
      setAuthPending(false)
      dispatchFlow({
        type: "fail",
        sessionId: flowState.sessionId,
        secret: flowState.secret,
        error: "Could not establish a public tunnel for the Personal Server. The requesting app won't be able to access your data.",
      })
      return
    }
    if (!isDemo && (!personalServer.port || !personalServer.tunnelUrl)) {
      transitionFlow("preparing-server")
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
