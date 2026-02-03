import { useBrowserLogin } from "./use-browser-login"
import { InvalidRequestView } from "./components/invalid-request-view"
import { LoadingView } from "./components/loading-view"
import { SuccessView } from "./components/success-view"
import { WalletCreatingView } from "./components/wallet-creating-view"
import { BrowserLoginForm } from "./components/browser-login-form"

export function BrowserLogin() {
  const {
    callbackPort,
    ready,
    authenticated,
    email,
    setEmail,
    code,
    setCode,
    isCodeSent,
    error,
    isCreatingWallet,
    authSent,
    isLoading,
    oauthState,
    emailState,
    handleGoogleLogin,
    handleSendCode,
    handleLoginWithCode,
    handleResetEmail,
  } = useBrowserLogin()

  if (!callbackPort) {
    return <InvalidRequestView />
  }

  if (!ready) {
    return <LoadingView />
  }

  if (authSent) {
    return <SuccessView />
  }

  if (authenticated && isCreatingWallet) {
    return <WalletCreatingView />
  }

  return (
    <BrowserLoginForm
      email={email}
      setEmail={setEmail}
      code={code}
      setCode={setCode}
      isCodeSent={isCodeSent}
      error={error}
      isLoading={isLoading}
      oauthStatus={oauthState.status}
      emailStatus={emailState.status}
      onGoogleLogin={handleGoogleLogin}
      onSendCode={handleSendCode}
      onLoginWithCode={handleLoginWithCode}
      onResetEmail={handleResetEmail}
    />
  )
}
