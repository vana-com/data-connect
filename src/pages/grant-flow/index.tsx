import { useSearchParams } from "react-router-dom"
import { getGrantParamsFromSearchParams } from "@/lib/grant-params"
import { useGrantFlow } from "./use-grant-flow"
import { GrantLoadingState } from "./components/grant-loading-state"
import { GrantAuthRequiredState } from "./components/grant-auth-required-state"
import { GrantErrorState } from "./components/grant-error-state"
import { GrantSuccessState } from "./components/grant-success-state"
import { GrantConsentState } from "./components/consent/grant-consent-state"

export function GrantFlow() {
  const [searchParams] = useSearchParams()
  const params = getGrantParamsFromSearchParams(searchParams)

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

  if (flowState.status === "loading" || authLoading) {
    return <GrantLoadingState />
  }

  if (flowState.status === "auth-required") {
    return (
      <GrantAuthRequiredState
        appName={flowState.session?.appName}
        authUrl={authUrl}
        authError={authError}
        declineHref={declineHref}
        onRetryAuth={startBrowserAuth}
      />
    )
  }

  if (flowState.status === "error") {
    return <GrantErrorState error={flowState.error} declineHref={declineHref} />
  }

  if (flowState.status === "success") {
    return (
      <GrantSuccessState appName={flowState.session?.appName} declineHref={declineHref} />
    )
  }

  return (
    <GrantConsentState
      session={flowState.session}
      walletAddress={walletAddress}
      currentStep={currentStep}
      isApproving={isApproving}
      declineHref={declineHref}
      onApprove={handleApprove}
    />
  )
}
