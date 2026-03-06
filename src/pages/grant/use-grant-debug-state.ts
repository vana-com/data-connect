import { useCallback, useEffect, useMemo } from "react"
import type { NavigateFunction } from "react-router-dom"
import {
  buildGrantDebugSearchParams,
  getConsentDebugScopes,
  getConsentScopeScenarioFromSearch,
  getGrantDebugStatusFromSearch,
  type ConsentDebugScenario,
} from "./grant-ui-debug"
import type {
  BuilderManifest,
  GrantFlowParams,
  GrantFlowState,
  GrantSession,
} from "./types"

const DEBUG_SESSION_ID = "grant-session-debug"

function getDebugSession(params?: Pick<GrantFlowParams, "sessionId" | "appId" | "scopes">): GrantSession {
  const sessionId = params?.sessionId || DEBUG_SESSION_ID
  const scopes = params?.scopes?.length
    ? params.scopes
    : ["chatgpt.conversations"]

  return {
    id: sessionId,
    granteeAddress: "0x0000000000000000000000000000000000000000",
    scopes,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    appName: params?.appId ?? "Debug App",
    appIcon: "🔗",
  }
}

function getDebugBuilderManifest(
  flowStateBuilderManifest: BuilderManifest | undefined,
  debugSession: GrantSession
): BuilderManifest {
  return flowStateBuilderManifest ?? {
    name: debugSession.appName ?? "Debug App",
    appUrl: "https://example.com",
    privacyPolicyUrl: "https://example.com/privacy",
    termsUrl: "https://example.com/terms",
    supportUrl: "https://example.com/support",
  }
}

interface UseGrantDebugStateArgs {
  search: string
  navigate: NavigateFunction
  params?: Pick<GrantFlowParams, "sessionId" | "appId" | "scopes">
  flowState: GrantFlowState
  authLoading: boolean
  isApproving: boolean
  builderName?: string
}

export function useGrantDebugState({
  search,
  navigate,
  params,
  flowState,
  authLoading,
  isApproving,
  builderName,
}: UseGrantDebugStateArgs) {
  const debugStatusFromUrl = useMemo(
    () => getGrantDebugStatusFromSearch(search),
    [search]
  )
  const debugStatus = useMemo(() => {
    if (debugStatusFromUrl !== null) return debugStatusFromUrl

    // DEV: when no sessionId, default to consent so debugger is usable (same as Home)
    if (import.meta.env.DEV && !params?.sessionId) return "consent"

    return null
  }, [debugStatusFromUrl, params?.sessionId])
  const consentDebugScenario = useMemo(
    () => getConsentScopeScenarioFromSearch(search),
    [search]
  )

  useEffect(() => {
    if (
      import.meta.env.DEV &&
      !params?.sessionId &&
      debugStatusFromUrl === null &&
      debugStatus === "consent"
    ) {
      const next = buildGrantDebugSearchParams(search, {
        grantStatus: "consent",
      })
      navigate({ search: `?${next}` }, { replace: true })
    }
  }, [debugStatusFromUrl, debugStatus, search, navigate, params?.sessionId])

  const setDebugStatus = useCallback(
    (status: GrantFlowState["status"] | null) => {
      const next = buildGrantDebugSearchParams(search, {
        grantStatus: status,
        ...(status === null && { consentScopeScenario: null }),
      })
      navigate({ search: next ? `?${next}` : "" }, { replace: true })
    },
    [search, navigate]
  )
  const setConsentDebugScenario = useCallback(
    (scenario: ConsentDebugScenario) => {
      const next = buildGrantDebugSearchParams(search, {
        consentScopeScenario: scenario,
      })
      navigate({ search: next ? `?${next}` : "" }, { replace: true })
    },
    [search, navigate]
  )

  const activeDebugStatus = debugStatus ?? "loading"
  const debugSession = getDebugSession(params)
  const isDebugging = import.meta.env.DEV && debugStatus !== null
  const resolvedFlowState = isDebugging
    ? {
        sessionId: debugSession.id,
        status: activeDebugStatus,
        session: debugSession,
        ...(activeDebugStatus === "error" && {
          error: "Mock grant error. This is a dev-only state.",
        }),
      }
    : flowState
  const resolvedAuthLoading = isDebugging ? false : authLoading
  const resolvedIsApproving = isDebugging
    ? activeDebugStatus === "creating-grant" ||
      activeDebugStatus === "approving"
    : isApproving
  const resolvedAppName = isDebugging ? debugSession.appName : builderName
  const resolvedBuilderManifest = isDebugging
    ? getDebugBuilderManifest(flowState.builderManifest, debugSession)
    : flowState.builderManifest
  const resolvedConsentScopes =
    getConsentDebugScopes(consentDebugScenario) ??
    resolvedFlowState.session?.scopes ??
    []

  return {
    debugSession,
    debugStatus,
    consentDebugScenario,
    isDebugging,
    resolvedFlowState,
    resolvedAuthLoading,
    resolvedIsApproving,
    resolvedAppName,
    resolvedBuilderManifest,
    resolvedConsentScopes,
    setDebugStatus,
    setConsentDebugScenario,
  }
}
