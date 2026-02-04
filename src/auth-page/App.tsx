import { ArrowRight, Loader2, Mail } from "lucide-react"
import { VanaLogotype } from "@/components/icons/vana-logotype"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Text } from "@/components/typography/text"
import { PlatformAppleIcon } from "@/components/icons/platform-apple"
import { useAuthPage } from "./auth"
import { cn } from "@/lib/classes"

// View this page locally:
// - npx vite --config vite.auth.config.ts
// - open http://localhost:5173
// (Optional) Full Tauri window: npm run tauri:dev

const GoogleIcon = () => (
  <svg className="size-5" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
)

export const App = () => {
  const {
    view,
    loadingText,
    error,
    email,
    code,
    showCode,
    isSendingEmail,
    isVerifyingCode,
    isGoogleLoading,
    isAppleLoading,
    walletIframeUrl,
    walletIframeRef,
    handleWalletIframeLoad,
    handleEmailChange,
    handleCodeChange,
    handleEmailSubmit,
    handleVerifyCode,
    handleGoogleLogin,
    handleAppleLogin,
  } = useAuthPage()

  const isEmailDisabled = isSendingEmail || isGoogleLoading || isAppleLoading
  const isVerifyDisabled = isVerifyingCode || isGoogleLoading || isAppleLoading

  return (
    <main className="viewport-wrapper bg-muted text-foreground">
      <div className="viewport-wrapper-child flex min-h-[inherit] items-center justify-center px-6 py-10">
        <div
          className={cn(
            "container bg-background rounded-squish",
            "py-w12 px-w8",
            "ring-1 ring-foreground/10"
          )}
        >
          {view === "loading" && (
            <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
              <Loader2 className="size-8 animate-spin text-accent" />
              <Text intent="small" color="mutedForeground">
                {loadingText}
              </Text>
            </div>
          )}

          {view === "success" && (
            <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-success/20 text-success">
                <svg
                  className="size-8"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M5 13l4 4L19 7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <Text as="h2" intent="heading" weight="semi">
                You are signed in!
              </Text>
              <Text intent="small" color="mutedForeground">
                You can close this window and return to the app.
              </Text>
            </div>
          )}

          {view === "login" && (
            <div className="space-y-6">
              <div className="space-y-gap">
                <VanaLogotype height={13} className="text-iris" />
                <Text as="h1" intent="title">
                  <span className="text-iris">
                    Data Connect uses Vana Passport
                  </span>
                  <br />
                  to bring your data everywhere
                </Text>
                <Text as="p" dim>
                  Sign-in or create your Vana Passport to grant permissions.
                </Text>
              </div>

              {error && (
                <div className="rounded-[10px] border border-destructive/30 bg-destructive/10 px-3 py-2 text-small text-destructive">
                  {error}
                </div>
              )}

              <div className="space-y-gap">
                {!showCode && (
                  <div className="flex items-center gap-3 rounded-[14px] border border-input bg-background px-3 py-1.5 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
                    <Mail className="size-5 text-muted-foreground" />
                    <Input
                      type="email"
                      value={email}
                      onChange={event => handleEmailChange(event.target.value)}
                      onKeyDown={event => {
                        if (event.key === "Enter") {
                          handleEmailSubmit()
                        }
                      }}
                      placeholder="jane@example.com"
                      className="h-8 border-0 bg-transparent px-0 text-body focus-visible:border-transparent focus-visible:ring-0"
                    />
                    <Button
                      type="button"
                      variant="accent"
                      size="icon"
                      onClick={handleEmailSubmit}
                      disabled={isEmailDisabled}
                      aria-label="Send sign-in code"
                    >
                      <ArrowRight className="size-4" />
                    </Button>
                  </div>
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  fullWidth
                  className="justify-start gap-3"
                  onClick={handleGoogleLogin}
                  disabled={isGoogleLoading}
                >
                  <GoogleIcon />
                  Continue with Google
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  fullWidth
                  className="justify-start gap-3"
                  onClick={handleAppleLogin}
                  disabled={isAppleLoading}
                >
                  <PlatformAppleIcon className="size-5" />
                  Continue with Apple
                </Button>
              </div>

              {showCode && (
                <div className="space-y-3">
                  <Text
                    as="label"
                    intent="small"
                    weight="medium"
                    className="block"
                  >
                    Enter verification code
                  </Text>
                  <Input
                    type="text"
                    value={code}
                    onChange={event => handleCodeChange(event.target.value)}
                    onKeyDown={event => {
                      if (event.key === "Enter") {
                        handleVerifyCode()
                      }
                    }}
                    placeholder="------"
                    maxLength={6}
                    className="h-12 text-center text-xlarge tracking-[0.35em]"
                  />
                  <Button
                    type="button"
                    variant="accent"
                    size="lg"
                    fullWidth
                    onClick={handleVerifyCode}
                    disabled={isVerifyDisabled}
                  >
                    {isVerifyingCode ? "Verifying..." : "Verify code"}
                  </Button>
                </div>
              )}

              <Text
                intent="fine"
                color="mutedForeground"
                align="center"
                className="leading-relaxed"
              >
                By creating an account, you agree to our{" "}
                <a
                  className="link"
                  href="https://www.vana.org/terms"
                  target="_blank"
                >
                  Terms of Service
                </a>{" "}
                and{" "}
                <a
                  className="link"
                  href="https://www.vana.org/privacy-policy"
                  target="_blank"
                >
                  Privacy Policy
                </a>
                .
              </Text>
            </div>
          )}
        </div>

        {walletIframeUrl && (
          <iframe
            ref={walletIframeRef}
            title="Privy Wallet"
            src={walletIframeUrl}
            onLoad={handleWalletIframeLoad}
            className="hidden"
            data-privy-wallet="true"
          />
        )}
      </div>
    </main>
  )
}
