import { useState } from "react"
import { useSearchParams } from "react-router-dom"
import { getGrantParamsFromSearchParams } from "@/lib/grant-params"
import { consumePendingGrantPrefetch } from "@/lib/pending-grant-prefetch"
import { useBrowserStatus } from "./use-browser-status"
import { useGrantFlow } from "./use-grant-flow"
import { BrowserSetupSection } from "./components/browser-setup-section"
import { GrantLoadingState } from "./components/grant-loading-state"
import { GrantErrorState } from "./components/grant-error-state"
import { GrantSuccessState } from "./components/grant-success-state"
import { GrantConsentState } from "./components/consent/grant-consent-state"
import { GrantDebugPanel } from "./components/grant-debug-panel.tsx"
import type { BuilderManifest, GrantFlowState, GrantSession, PrefetchedGrantData } from "./types"

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
  const params = getGrantParamsFromSearchParams(searchParams)
  // Pre-fetched session + builder data from process-scoped handoff cache.
  // When available, the grant flow skips claim + verify steps (already done in background).
  const [prefetched] = useState<PrefetchedGrantData | undefined>(() =>
    consumePendingGrantPrefetch(params?.sessionId)
  )
  const [debugStatus, setDebugStatus] = useState<
    GrantFlowState["status"] | null
  >(null)
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
    ? activeDebugStatus === "creating-grant"
    : isApproving
  const resolvedBuilderName = isDebugging
    ? debugSession.appName
    : builderName
  const debugBuilderManifest: BuilderManifest =
    flowState.builderManifest ?? {
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
    const loadingMessage = resolvedFlowState.status === "preparing-server"
      ? "Preparing secure connection…"
      : undefined
    content = <GrantLoadingState message={loadingMessage} />
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
    // consent + creating-grant both show consent UI
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
