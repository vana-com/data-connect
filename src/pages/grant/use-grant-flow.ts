import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useDispatch } from "react-redux"
import { useAuth } from "../../hooks/useAuth"
import { addConnectedApp } from "../../state/store"
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
  GrantSession,
  PrefetchedGrantData,
} from "./types"
import { ROUTES } from "@/config/routes"

const ACCOUNT_URL =
  import.meta.env.VITE_ACCOUNT_URL || "https://account.vana.org"

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
  const [flowState, setFlowState] = useState<GrantFlowState>({
    sessionId: "",
    status: "loading",
  })
  const [isApproving, setIsApproving] = useState(false)
  const [authPending, setAuthPending] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  const sessionId = params?.sessionId
  const secret = params?.secret
  const hasSuccessOverride = params?.status === "success"

  // Reset auth state when sessionId changes
  useEffect(() => {
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
        console.log("[GrantFlow] Using pre-fetched data (skipping claim + verify)", {
          sessionId: prefetched.session.id,
          builderName: prefetched.builderManifest.name,
        });
        setFlowState(prev => ({
          ...prev,
          status: "consent",
          session: prefetched.session,
          builderManifest: prefetched.builderManifest,
        }))

        return
      }

      // --- Pre-fetched session only: claim done, builder verification still needed ---
      if (prefetched?.session) {
        console.log("[GrantFlow] Using pre-fetched session (skipping claim, verifying builder)", {
          sessionId: prefetched.session.id,
        });
        setFlowState(prev => ({ ...prev, session: prefetched.session }))

        try {
          setFlowState(prev => ({ ...prev, status: "verifying-builder" }))
          const builderManifest = await verifyBuilder(
            prefetched.session.granteeAddress,
            prefetched.session.webhookUrl,
          )
          if (cancelled) return
          setFlowState(prev => ({ ...prev, builderManifest }))
          setFlowState(prev => ({ ...prev, status: "consent" }))
        } catch (error) {
          if (cancelled) return
          console.error("[GrantFlow] Builder verification failed (pre-fetched session)", {
            sessionId: prefetched.session.id,
            message: error instanceof Error ? error.message : String(error),
          });
          setFlowState({
            sessionId,
            secret,
            status: "error",
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
        console.log("[GrantFlow] Falling back to fresh claim (no pre-fetched data)", { sessionId });
        setFlowState(prev => ({ ...prev, status: "claiming" }))
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
        setFlowState(prev => ({ ...prev, session }))

        // Step 2: Verify builder
        // Protocol spec: "If manifest discovery or signature verification fails,
        // the Desktop App MUST NOT render the consent screen and MUST fail the session flow."
        setFlowState(prev => ({ ...prev, status: "verifying-builder" }))
        const builderManifest = await verifyBuilder(
          claimed.granteeAddress,
          claimed.webhookUrl,
        )
        if (cancelled) return
        setFlowState(prev => ({ ...prev, builderManifest }))

        // Advance to consent (data export already completed on the connect page)
        setFlowState(prev => ({ ...prev, status: "consent" }))

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
        setFlowState({
          sessionId,
          secret,
          status: "error",
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
  }, [sessionId, secret, retryCount])

  // Handle success override (when returning from connect page)
  useEffect(() => {
    if (!hasSuccessOverride || !flowState.session) return
    if (flowState.status === "success") return
    setFlowState(prev => ({ ...prev, status: "success" }))
  }, [flowState.session, flowState.status, hasSuccessOverride])

  // --- Approve flow ---
  const handleApprove = useCallback(async () => {
    if (!flowState.session) return

    // Auth should already be populated from the deep link (masterKeySig).
    // If missing, the user needs to sign in via account.vana.org first.
    if (!isAuthenticated || !walletAddress) {
      const connectUrl = new URL("/connect", ACCOUNT_URL)
      if (flowState.sessionId) connectUrl.searchParams.set("sessionId", flowState.sessionId)
      if (flowState.secret) connectUrl.searchParams.set("secret", flowState.secret)
      setFlowState(prev => ({
        ...prev,
        status: "error",
        error: `Not signed in. Please sign in at ${connectUrl.toString()} and relaunch Data Connect.`,
      }))
      return
    }

    // If Personal Server isn't fully ready yet (port + tunnel), defer.
    // The auto-approve effect will resume once both are available.
    // The tunnel is required so the builder app can reach the server externally.
    if (!personalServer.port || !personalServer.tunnelUrl) {
      setAuthPending(true)
      setFlowState(prev => ({ ...prev, status: "creating-grant" }))
      return
    }

    setIsApproving(true)

    try {
      // Skip grant creation + session approval for demo sessions
      if (isDemoSession(flowState.sessionId)) {
        setFlowState(prev => ({ ...prev, status: "success" }))
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
      setFlowState(prev => ({ ...prev, status: "creating-grant" }))

      const expiresAtNum = flowState.session.expiresAt
        ? Math.floor(new Date(flowState.session.expiresAt).getTime() / 1000)
        : undefined

      const { grantId } = await createGrant(personalServer.port, {
        granteeAddress: flowState.session.granteeAddress,
        scopes: flowState.session.scopes,
        expiresAt: expiresAtNum,
      }, personalServer.devToken)

      setFlowState(prev => ({ ...prev, grantId }))

      // Fetch the Personal Server's own address so the builder can resolve
      // the server via Gateway (registered under this address, not the user's).
      const { address: serverAddress } = await fetchServerIdentity(personalServer.port)

      // Step: Approve session via Session Relay
      setFlowState(prev => ({ ...prev, status: "approving" }))

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
    personalServer.tunnelUrl,
    personalServer.devToken,
    dispatch,
  ])

  // Auto-approve after auth is ready and Personal Server is available.
  // Auth is now populated from the deep link, but the Personal Server
  // may still be starting up when the user clicks Allow.
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
      setFlowState(prev => ({
        ...prev,
        status: "error",
        error: personalServer.error || "Personal Server failed to start.",
      }))
      return
    }
    const isDemo = isDemoSession(flowState.sessionId)
    // During Phase 2 restart, wait for the server to come back up.
    // restartingRef is set synchronously during render so we see it
    // before any stale tunnelFailed state from Phase 1.
    if (!isDemo && personalServer.restartingRef.current) {
      setFlowState(prev => prev.status === "preparing-server" ? prev : { ...prev, status: "preparing-server" })
      return
    }
    // If the tunnel timed out (90s), surface the error.
    if (tunnelTimedOut) {
      setAuthPending(false)
      setFlowState(prev => ({
        ...prev,
        status: "error",
        error: "Could not establish a public tunnel for the Personal Server. The requesting app won't be able to access your data.",
      }))
      return
    }
    if (!isDemo && (!personalServer.port || !personalServer.tunnelUrl)) {
      setFlowState(prev => prev.status === "preparing-server" ? prev : { ...prev, status: "preparing-server" })
      return
    }
    setAuthPending(false)
    void handleApprove()
  }, [authPending, handleApprove, isAuthenticated, walletAddress, personalServer.port, personalServer.tunnelUrl, tunnelTimedOut, personalServer.status, personalServer.error, flowState.sessionId])

  // --- Retry from error ---
  // Bumps retryCount which re-triggers the main flow effect (claim → verify → consent).
  // For errors during grant creation/approval, the user returns to consent
  // and can click Allow again.
  const handleRetry = useCallback(() => {
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
    handleApprove,
    handleDeny,
    handleRetry,
    declineHref,
    authLoading,
    walletAddress,
    builderName,
  }
}
