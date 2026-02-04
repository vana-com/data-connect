import { LoaderIcon } from "lucide-react"
import { Text } from "@/components/typography/text"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/classes"
import { inputClassName } from "../utils"

interface BrowserLoginFormProps {
  email: string
  setEmail: (email: string) => void
  code: string
  setCode: (code: string) => void
  isCodeSent: boolean
  error: string | null
  isLoading: boolean
  oauthStatus: string
  emailStatus: string
  onGoogleLogin: () => void
  onSendCode: () => void
  onLoginWithCode: () => void
  onResetEmail: () => void
}

export function BrowserLoginForm({
  email,
  setEmail,
  code,
  setCode,
  isCodeSent,
  error,
  isLoading,
  oauthStatus,
  emailStatus,
  onGoogleLogin,
  onSendCode,
  onLoginWithCode,
  onResetEmail,
}: BrowserLoginFormProps) {
  return (
    <div className="grid min-h-screen place-items-center bg-muted px-6 py-10">
      <div className="w-full max-w-[420px] rounded-card bg-background p-10 shadow-md">
        <div className="space-y-2 text-center">
          <Text as="h1" intent="heading" weight="semi">
            Welcome to Data Connect
          </Text>
          <Text as="p" intent="small" color="mutedForeground">
            Sign in to continue
          </Text>
        </div>

        {error && (
          <div className="mt-6 rounded-button border border-destructive/30 bg-destructive/10 px-4 py-3">
            <Text as="p" intent="small" color="destructive">
              {error}
            </Text>
          </div>
        )}

        <div className="mt-8 space-y-6">
          <Button
            type="button"
            variant="outline"
            fullWidth
            onClick={onGoogleLogin}
            disabled={isLoading}
          >
            {oauthStatus === "loading" ? (
              <LoaderIcon
                aria-hidden="true"
                className="size-4 animate-spin motion-reduce:animate-none"
              />
            ) : (
              <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24">
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
            )}
            Continue with Google
          </Button>

          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-border" />
            <Text as="span" intent="fine" color="mutedForeground">
              or
            </Text>
            <div className="h-px flex-1 bg-border" />
          </div>

          {!isCodeSent ? (
            <div className="space-y-gap">
              <div className="space-y-2">
                <Text as="label" intent="fine" weight="medium" htmlFor="email">
                  Email
                </Text>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className={inputClassName}
                />
              </div>
              <Button
                type="button"
                variant="accent"
                fullWidth
                onClick={onSendCode}
                disabled={isLoading || !email}
              >
                {emailStatus === "sending-code" ? (
                  <>
                    <LoaderIcon
                      aria-hidden="true"
                      className="size-4 animate-spin motion-reduce:animate-none"
                    />
                    Sending...
                  </>
                ) : (
                  "Send sign-in code"
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-gap">
              <div className="space-y-2">
                <Text as="label" intent="fine" weight="medium" htmlFor="code">
                  Enter the code sent to {email}
                </Text>
                <input
                  id="code"
                  type="text"
                  value={code}
                  onChange={event => setCode(event.target.value)}
                  placeholder="Enter code"
                  maxLength={6}
                  className={cn(inputClassName, "text-center tracking-[0.35em]")}
                />
              </div>
              <Button
                type="button"
                variant="accent"
                fullWidth
                onClick={onLoginWithCode}
                disabled={isLoading || !code}
              >
                {emailStatus === "submitting-code" ? (
                  <>
                    <LoaderIcon
                      aria-hidden="true"
                      className="size-4 animate-spin motion-reduce:animate-none"
                    />
                    Verifying...
                  </>
                ) : (
                  "Verify code"
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                fullWidth
                onClick={onResetEmail}
                className="text-muted-foreground"
              >
                Use a different email
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
