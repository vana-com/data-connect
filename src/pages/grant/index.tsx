import { useState } from "react"
import { useSearchParams } from "react-router-dom"
import { getGrantParamsFromSearchParams } from "@/lib/grant-params"
import { DEFAULT_APP_ID, getAppRegistryEntry } from "@/apps/registry"
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
  GrantFlowParams,
  GrantFlowState,
  GrantSession,
  GrantStep,
} from "./types"

const DEBUG_SESSION_ID = "grant-session-debug"
const DEBUG_WALLET_ADDRESS = "0x5c4a8b2e1f0d8f3b9c7d2a5e1c4b9a7d8f3b2a1c"
const DEBUG_STEP_BY_STATUS: Record<GrantFlowState["status"], GrantStep> = {
  loading: 1,
  "auth-required": 1,
  consent: 2,
  signing: 3,
  success: 3,
  error: 2,
}

function getDebugSession(params?: GrantFlowParams | null): GrantSession {
  const resolvedAppId = params?.appId ?? DEFAULT_APP_ID
  const appInfo = getAppRegistryEntry(resolvedAppId)
  const scopes =
    params?.scopes && params.scopes.length > 0
      ? params.scopes
      : (appInfo?.scopes ?? ["read:data"])
  return {
    id: params?.sessionId ?? DEBUG_SESSION_ID,
    appId: resolvedAppId,
    appName: appInfo?.name ?? resolvedAppId,
    appIcon: appInfo?.icon ?? "🔗",
    scopes,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  }
}

export function Grant() {
  const browserStatus = useBrowserStatus()
  const [searchParams] = useSearchParams()
  const params = getGrantParamsFromSearchParams(searchParams)
  const [debugStatus, setDebugStatus] = useState<
    GrantFlowState["status"] | null
  >(null)
  const [debugWalletConnected, setDebugWalletConnected] = useState(true)

  const {
    flowState,
    currentStep,
    isApproving,
    authUrl,
    authError,
    startBrowserAuth,
    handleApprove,
    declineHref,
    authLoading,
    walletAddress,
  } = useGrantFlow(params ?? {})

  const isDev = import.meta.env.DEV
  const activeDebugStatus = debugStatus ?? "loading"
  const debugSession = getDebugSession(params ?? undefined)
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
  const resolvedCurrentStep = isDebugging
    ? DEBUG_STEP_BY_STATUS[activeDebugStatus]
    : currentStep
  const resolvedIsApproving = isDebugging
    ? activeDebugStatus === "signing"
    : isApproving
  const resolvedAuthUrl =
    isDebugging && activeDebugStatus === "auth-required"
      ? "https://passport.vana.org"
      : authUrl
  const resolvedAuthError = isDebugging ? null : authError
  const resolvedWalletAddress = isDebugging
    ? debugWalletConnected
      ? DEBUG_WALLET_ADDRESS
      : null
    : walletAddress

  let content = null
  if (browserStatus.status !== "ready" && !isDebugging) {
    content = (
      <div className="container py-w16">
        <BrowserSetupSection browserStatus={browserStatus} />
      </div>
    )
  } else if (resolvedFlowState.status === "loading" || resolvedAuthLoading) {
    content = <GrantLoadingState />
  } else if (resolvedFlowState.status === "auth-required") {
    content = (
      <GrantAuthRequiredState
        appName={resolvedFlowState.session?.appName}
        authUrl={resolvedAuthUrl}
        authError={resolvedAuthError}
        declineHref={declineHref}
        onRetryAuth={startBrowserAuth}
      />
    )
  } else if (resolvedFlowState.status === "error") {
    content = (
      <GrantErrorState
        error={resolvedFlowState.error}
        declineHref={declineHref}
      />
    )
  } else if (resolvedFlowState.status === "success") {
    content = (
      <GrantSuccessState
        appName={resolvedFlowState.session?.appName}
        declineHref={declineHref}
      />
    )
  } else {
    content = (
      <GrantConsentState
        session={resolvedFlowState.session}
        walletAddress={resolvedWalletAddress}
        currentStep={resolvedCurrentStep}
        isApproving={resolvedIsApproving}
        declineHref={declineHref}
        onApprove={handleApprove}
      />
    )
  }

  return (
    <>
      {content}
      {isDev ? (
        <GrantDebugPanel
          activeStatus={debugStatus}
          session={debugSession}
          walletConnected={debugWalletConnected}
          onChangeStatus={setDebugStatus}
          onToggleWallet={() => setDebugWalletConnected(prev => !prev)}
        />
      ) : null}
    </>
  )
}
