import { useCallback, useEffect, useMemo, useReducer, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useDispatch } from "react-redux"
import { useAuth } from "../../hooks/useAuth"
import { addConnectedApp } from "../../state/store"
import { denySession } from "../../services/sessionRelay"
import { usePersonalServer } from "../../hooks/usePersonalServer"
import { savePendingGrantRedirect } from "../../lib/storage"
import type {
  BuilderManifest,
  GrantFlowParams,
  GrantSession,
  PrefetchedGrantData,
} from "./types"
import { ROUTES } from "@/config/routes"
import { buildGrantSearchParams } from "@/lib/grant-params"
import {
  clearPendingGrantSecret,
  consumePendingGrantSecret,
  hasPendingGrantSecret,
  stashPendingGrantSecret,
} from "@/lib/pending-grant-secret"
import {
  createInitialGrantFlowState,
  reduceGrantFlow,
} from "./grant-flow-machine"
import {
  resolveGrantBootstrap,
  toBootstrapErrorMessage,
} from "./grant-flow-bootstrap"
import {
  executeGrantApproval,
  toApprovalErrorMessage,
} from "./grant-flow-approve"
import { usePersonalServerReadinessGate } from "./use-personal-server-readiness-gate"

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

export function useGrantFlow(
  params: GrantFlowParams,
  prefetched?: PrefetchedGrantData
) {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { isAuthenticated, isLoading: authLoading, walletAddress } = useAuth()
  const personalServer = usePersonalServer()
  const [flowState, dispatchFlow] = useReducer(
    reduceGrantFlow,
    undefined,
    createInitialGrantFlowState
  )
  const [isApproving, setIsApproving] = useState(false)
  const [approvalPending, setApprovalPending] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  const sessionId = params?.sessionId
  const [resumedSecret, setResumedSecret] = useState<string | undefined>(undefined)
  const secret = params?.secret ?? resumedSecret
  const waitingForResumedSecret =
    Boolean(sessionId) &&
    !params?.secret &&
    !resumedSecret &&
    hasPendingGrantSecret(sessionId)
  const hasSuccessOverride = params?.status === "success"
  const contractGatedParamKeys = useMemo(
    () => Object.keys(params?.contractGatedParams ?? {}),
    [params?.contractGatedParams]
  )
  const contractGatedParamSignature = useMemo(
    () =>
      Object.entries(params?.contractGatedParams ?? {})
        .sort(([aKey, aValue], [bKey, bValue]) => {
          if (aKey === bKey) return aValue.localeCompare(bValue)
          return aKey.localeCompare(bKey)
        })
        .map(([key, value]) => `${key}=${value}`)
        .join("&"),
    [params?.contractGatedParams]
  )
  const contractGatedParamsSnapshot = useMemo(
    () => ({ ...(params?.contractGatedParams ?? {}) }),
    [contractGatedParamSignature]
  )
  const shouldLogGrantDebug =
    import.meta.env.DEV &&
    import.meta.env.VITE_DEBUG_GRANT_FLOW === "true"

  useEffect(() => {
    setApprovalPending(false)
  }, [sessionId])

  useEffect(() => {
    if (!sessionId) {
      setResumedSecret(undefined)
      return
    }
    if (params?.secret) {
      setResumedSecret(undefined)
      clearPendingGrantSecret(sessionId)
      return
    }
    setResumedSecret(consumePendingGrantSecret(sessionId))
  }, [params?.secret, sessionId])

  useEffect(() => {
    if (waitingForResumedSecret) return
    if (!sessionId) {
      dispatchFlow({
        type: "BOOTSTRAP_ERROR",
        sessionId: "",
        error: "No session ID provided. Please restart the flow from the app.",
      })
      return
    }

    let cancelled = false

    const runFlow = async () => {
      if (contractGatedParamKeys.length > 0) {
        // TODO(contract-gated): keep passthrough behavior until upstream launch
        // contract is frozen; do not enforce strict URL-only assumptions yet.
        if (shouldLogGrantDebug) {
          console.warn(
            "[GrantFlow][TODO] Contract-gated launch params detected; final strict resolution is intentionally deferred.",
            {
              keys: contractGatedParamKeys,
              params: contractGatedParamsSnapshot,
            }
          )
        }
      }

      dispatchFlow({ type: "BOOTSTRAP_START", sessionId, secret })

      try {
        const { session, builderManifest } = await resolveGrantBootstrap(
          {
            sessionId,
            secret,
            prefetched,
            isDemoSession,
            createDemoSession,
            createDemoBuilderManifest,
            onStatusChange: (status) => {
              if (cancelled) return
              dispatchFlow({ type: "SET_STATUS", status })
            },
          }
        )

        if (cancelled) return

        dispatchFlow({
          type: "BOOTSTRAP_SUCCESS",
          sessionId,
          secret,
          session,
          builderManifest,
        })
      } catch (error) {
        if (cancelled) return
        dispatchFlow({
          type: "BOOTSTRAP_ERROR",
          sessionId,
          secret,
          error: toBootstrapErrorMessage(error),
        })
      }
    }

    void runFlow()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- prefetched is stable from navigation state
  }, [
    sessionId,
    secret,
    retryCount,
    waitingForResumedSecret,
    contractGatedParamSignature,
    contractGatedParamsSnapshot,
    shouldLogGrantDebug,
  ])

  useEffect(() => {
    if (!hasSuccessOverride || !flowState.session) return
    if (flowState.status === "success") return
    dispatchFlow({ type: "FORCE_SUCCESS" })
  }, [flowState.session, flowState.status, hasSuccessOverride])

  const handleApprove = useCallback(async () => {
    if (!flowState.session) return

    if (!isAuthenticated || !walletAddress) {
      stashPendingGrantSecret(sessionId, secret)
      const resumeSearch = buildGrantSearchParams({
        ...params,
        secret: undefined,
      }).toString()
      const resumeRoute = `${ROUTES.grant}${resumeSearch ? `?${resumeSearch}` : ""}`
      savePendingGrantRedirect(resumeRoute)
      navigate(ROUTES.home)
      return
    }

    const isDemo = isDemoSession(flowState.sessionId)
    if (
      !isDemo &&
      (personalServer.restartingRef.current ||
        !personalServer.port ||
        !personalServer.tunnelUrl)
    ) {
      setApprovalPending(true)
      dispatchFlow({ type: "SET_STATUS", status: "preparing-server" })
      return
    }

    setIsApproving(true)
    try {
      if (isDemo) {
        dispatchFlow({ type: "FORCE_SUCCESS" })
        return
      }
      if (!personalServer.port) {
        setApprovalPending(true)
        dispatchFlow({ type: "SET_STATUS", status: "preparing-server" })
        return
      }

      dispatchFlow({ type: "SET_STATUS", status: "creating-grant" })
      const { grantId } = await executeGrantApproval({
        flowState,
        walletAddress,
        personalServerPort: personalServer.port,
        personalServerDevToken: personalServer.devToken,
      })

      dispatchFlow({ type: "SET_GRANT_ID", grantId })

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

      dispatchFlow({ type: "FORCE_SUCCESS" })
    } catch (error) {
      console.error("[GrantFlow] Approve failed:", error)
      dispatchFlow({
        type: "APPROVAL_ERROR",
        error: toApprovalErrorMessage(error),
      })
    } finally {
      setIsApproving(false)
    }
  }, [
    dispatch,
    flowState,
    isAuthenticated,
    navigate,
    params,
    personalServer.devToken,
    personalServer.port,
    personalServer.restartingRef,
    personalServer.tunnelUrl,
    secret,
    sessionId,
    walletAddress,
  ])

  const readinessGate = usePersonalServerReadinessGate({
    active: approvalPending && isAuthenticated && Boolean(walletAddress),
    isDemoSession: isDemoSession(flowState.sessionId),
    personalServer: {
      status: personalServer.status,
      port: personalServer.port,
      tunnelUrl: personalServer.tunnelUrl,
      error: personalServer.error,
      restartingRef: personalServer.restartingRef,
    },
  })

  useEffect(() => {
    if (!approvalPending || !isAuthenticated || !walletAddress) return
    if (readinessGate.status === "error") {
      setApprovalPending(false)
      dispatchFlow({
        type: "APPROVAL_ERROR",
        error: readinessGate.error ?? "Personal Server failed to start.",
      })
      return
    }
    if (readinessGate.status === "waiting") {
      if (flowState.status !== "preparing-server") {
        dispatchFlow({ type: "SET_STATUS", status: "preparing-server" })
      }
      return
    }
    setApprovalPending(false)
    void handleApprove()
  }, [
    approvalPending,
    handleApprove,
    flowState.status,
    isAuthenticated,
    readinessGate.error,
    readinessGate.status,
    walletAddress,
  ])

  const handleRetry = useCallback(() => {
    setApprovalPending(false)
    setRetryCount((count) => count + 1)
  }, [])

  const handleDeny = useCallback(async () => {
    if (flowState.sessionId && flowState.secret && !isDemoSession(flowState.sessionId)) {
      try {
        await denySession(flowState.sessionId, {
          secret: flowState.secret,
          reason: "User declined",
        })
      } catch (error) {
        console.warn("[GrantFlow] Deny call failed:", error)
      }
    }

    navigate(ROUTES.apps)
  }, [flowState.sessionId, flowState.secret, navigate])

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
