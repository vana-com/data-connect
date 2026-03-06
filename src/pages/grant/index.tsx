import { useSearchParams, useLocation, useNavigate } from "react-router-dom"
import { useState } from "react"
import { getGrantParamsFromSearchParams } from "@/lib/grant-params"
import { PageContainer } from "@/components/elements/page-container"
import { LoadingState } from "@/components/elements/loading-state"
import { useBrowserStatus } from "./use-browser-status"
import { useGrantDebugState } from "./use-grant-debug-state"
import { useGrantFlow } from "./use-grant-flow"
import { BrowserSetupSection } from "./components/browser-setup-section"
import { GrantErrorState } from "./components/grant-error-state"
import { GrantSuccessState } from "./components/grant-success-state"
import { GrantConsentState } from "./components/consent/grant-consent-state"
import { GrantDebugPanel } from "./components/grant-debug-panel.tsx"
import type { PrefetchedGrantData } from "./types"

export function Grant() {
  const browserStatus = useBrowserStatus()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
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
  const [debugWalletConnected, setDebugWalletConnected] = useState(true)

  const {
    flowState,
    isApproving,
    handleApprove,
    handleDeny,
    handleRetry,
    declineHref,
    authLoading,
    builderName,
  } = useGrantFlow(params ?? {}, prefetched)
  const {
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
  } = useGrantDebugState({
    search: location.search,
    navigate,
    params,
    flowState,
    authLoading,
    isApproving,
    builderName,
  })

  const isDev = import.meta.env.DEV

  // States that show loading spinner
  const isLoadingState =
    resolvedFlowState.status === "loading" ||
    resolvedFlowState.status === "claiming" ||
    resolvedFlowState.status === "verifying-builder" ||
    resolvedFlowState.status === "preparing-server"

  let content = null
  if (browserStatus.status !== "ready" && !isDebugging) {
    content = (
      <PageContainer>
        <BrowserSetupSection browserStatus={browserStatus} />
      </PageContainer>
    )
  } else if (isLoadingState || resolvedAuthLoading) {
    const loadingTitle =
      resolvedFlowState.status === "verifying-builder"
        ? "Verifying app configuration…"
        : resolvedFlowState.status === "preparing-server"
          ? "Preparing connection…"
          : "Loading…"
    content = <LoadingState title={loadingTitle} />
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
        appName={resolvedAppName}
        scopes={resolvedFlowState.session?.scopes}
      />
    )
  } else {
    // consent, creating-grant, approving all show consent UI
    content = (
      <GrantConsentState
        scopes={resolvedConsentScopes}
        builderManifest={resolvedBuilderManifest}
        appName={resolvedAppName}
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
          consentDebugScenario={consentDebugScenario}
          onConsentDebugScenarioChange={setConsentDebugScenario}
          onChangeStatus={setDebugStatus}
          onToggleWallet={() => setDebugWalletConnected(prev => !prev)}
        />
      ) : null}
    </>
  )
}
