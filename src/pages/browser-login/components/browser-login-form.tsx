import { GlobeIcon, LoaderIcon } from "lucide-react"
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
              <GlobeIcon aria-hidden="true" className="size-4" />
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
            <div className="space-y-4">
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
            <div className="space-y-4">
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
