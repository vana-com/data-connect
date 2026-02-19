import { useSearchParams, useLocation } from "react-router-dom"
import { useState } from "react"
import { getGrantParamsFromSearchParams } from "@/lib/grant-params"
import { useBrowserStatus } from "./use-browser-status"
import { useGrantFlow } from "./use-grant-flow"
import { BrowserSetupSection } from "./components/browser-setup-section"
import { GrantLoadingState } from "./components/grant-loading-state"
import { GrantAuthRequiredState } from "./components/grant-auth-required-state"
import { GrantErrorState } from "./components/grant-error-state"
import { GrantSuccessState } from "./components/grant-success-state"
import { GrantConsentState } from "./components/consent/grant-consent-state"
import { GrantDebugPanel } from "./components/grant-debug-panel.tsx"
import type {
  BuilderManifest,
  GrantFlowState,
  GrantSession,
  PrefetchedGrantData,
} from "./types"

const DEBUG_SESSION_ID = "grant-session-debug"
function getDebugSession(): GrantSession {
  return {
    id: DEBUG_SESSION_ID,
    granteeAddress: "0x0000000000000000000000000000000000000000",
    scopes: ["chatgpt.conversations"],
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    appName: "Debug App",
    appIcon: "🔗",
  }
}

export function Grant() {
  const browserStatus = useBrowserStatus()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const params = getGrantParamsFromSearchParams(searchParams)
  // Pre-fetched session + builder data passed from the connect page via navigation state.
  // When available, the grant flow skips claim + verify steps (already done in background).
  const prefetched = (
    location.state as { prefetched?: PrefetchedGrantData } | null
  )?.prefetched
  console.log("[Grant] Extracted prefetched from location.state", {
    hasPrefetched: prefetched !== undefined,
    hasSession: Boolean(prefetched?.session),
    hasBuilderManifest: Boolean(prefetched?.builderManifest),
    sessionId: prefetched?.session?.id,
    locationStateKeys: location.state
      ? Object.keys(location.state as object)
      : null,
  })
  const [debugStatus, setDebugStatus] = useState<
    GrantFlowState["status"] | null
  >(null)
  const [debugWalletConnected, setDebugWalletConnected] = useState(true)

  const {
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
    builderName,
  } = useGrantFlow(params ?? {}, prefetched)

  const isDev = import.meta.env.DEV
  const activeDebugStatus = debugStatus ?? "loading"
  const debugSession = getDebugSession()
  const isDebugging = isDev && debugStatus !== null
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
  const resolvedAuthUrl =
    isDebugging && activeDebugStatus === "auth-required"
      ? "https://passport.vana.org"
      : authUrl
  const resolvedAuthError = isDebugging ? null : authError
  const resolvedBuilderName = isDebugging ? debugSession.appName : builderName
  const debugBuilderManifest: BuilderManifest = flowState.builderManifest ?? {
    name: debugSession.appName ?? "Debug App",
    appUrl: "https://example.com",
    privacyPolicyUrl: "https://example.com/privacy",
    termsUrl: "https://example.com/terms",
    supportUrl: "https://example.com/support",
  }
  const resolvedBuilderManifest: BuilderManifest | undefined = isDebugging
    ? debugBuilderManifest
    : flowState.builderManifest

  // States that show loading spinner
  const isLoadingState =
    resolvedFlowState.status === "loading" ||
    resolvedFlowState.status === "claiming" ||
    resolvedFlowState.status === "verifying-builder" ||
    resolvedFlowState.status === "preparing-server"

  let content = null
  if (browserStatus.status !== "ready" && !isDebugging) {
    content = (
      <div className="container py-w16">
        <BrowserSetupSection browserStatus={browserStatus} />
      </div>
    )
  } else if (isLoadingState || resolvedAuthLoading) {
    const loadingTitle =
      resolvedFlowState.status === "verifying-builder"
        ? "Verifying app configuration…"
        : resolvedFlowState.status === "preparing-server"
          ? "Preparing connection…"
          : "Loading…"
    content = <GrantLoadingState title={loadingTitle} />
  } else if (resolvedFlowState.status === "auth-required") {
    content = (
      <GrantAuthRequiredState
        appName={resolvedBuilderName}
        authUrl={resolvedAuthUrl}
        authError={resolvedAuthError}
        onRetryAuth={startBrowserAuth}
        onDeny={handleDeny}
      />
    )
  } else if (resolvedFlowState.status === "error") {
    content = (
      <GrantErrorState
        error={resolvedFlowState.error}
        declineHref={declineHref}
        onRetry={isDebugging ? undefined : handleRetry}
      />
    )
  } else if (resolvedFlowState.status === "success") {
    content = (
      <GrantSuccessState
        appName={resolvedBuilderName}
        scopes={resolvedFlowState.session?.scopes}
      />
    )
  } else {
    // consent, creating-grant, approving all show consent UI
    content = (
      <GrantConsentState
        session={resolvedFlowState.session}
        builderManifest={resolvedBuilderManifest}
        builderName={resolvedBuilderName}
        isApproving={resolvedIsApproving}
        onApprove={handleApprove}
        onDeny={handleDeny}
      />
    )
  }

  return (
    <>
      {content}
      {isDev ? (
        <GrantDebugPanel
          activeStatus={debugStatus}
          debugBuilderName={debugSession.appName ?? "Debug App"}
          session={debugSession}
          walletConnected={debugWalletConnected}
          onChangeStatus={setDebugStatus}
          onToggleWallet={() => setDebugWalletConnected(prev => !prev)}
        />
      ) : null}
    </>
  )
}
