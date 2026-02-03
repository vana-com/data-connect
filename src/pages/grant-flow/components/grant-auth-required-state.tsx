import { Link } from "react-router-dom"
import { LoaderIcon } from "lucide-react"
import { Text } from "@/components/typography/text"

interface GrantAuthRequiredStateProps {
  appName?: string
  authUrl: string | null
  authError: string | null
  declineHref: string
  onRetryAuth: () => void
}

export function GrantAuthRequiredState({
  appName,
  authUrl,
  authError,
  declineHref,
  onRetryAuth,
}: GrantAuthRequiredStateProps) {
  const focusRing =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-6">
      <div className="w-full max-w-[440px] rounded-card bg-background p-10 shadow-md">
        <div className="flex flex-col items-center space-y-6 text-center">
          <LoaderIcon
            aria-hidden="true"
            className="size-12 animate-spin text-accent motion-reduce:animate-none"
          />
          <div className="space-y-3">
            <Text as="h1" intent="heading" weight="semi">
              Sign In to Continue
            </Text>
            <Text as="p" intent="body" color="mutedForeground">
              A sign-in page has opened in your browser. Complete the sign-in to grant{" "}
              <strong>{appName || "this app"}</strong> access to your data.
            </Text>
          </div>
          {authError && (
            <Text as="p" intent="small" color="destructive">
              {authError}
            </Text>
          )}
          {authUrl ? (
            <div className="w-full space-y-3">
              <button
                type="button"
                onClick={() => window.open(authUrl, "_blank", "noopener,noreferrer")}
                className={`inline-flex w-full items-center justify-center rounded-button bg-foreground px-4 py-2.5 text-background transition-colors hover:bg-foreground/90 ${focusRing}`}
              >
                <Text as="span" intent="button" weight="medium" color="inherit">
                  Open Sign-In Page
                </Text>
              </button>
              <Text
                as="div"
                intent="fine"
                color="mutedForeground"
                mono
                className="break-all"
              >
                {authUrl}
              </Text>
            </div>
          ) : (
            <button
              type="button"
              onClick={onRetryAuth}
              className={`inline-flex w-full items-center justify-center rounded-button border border-border bg-background px-4 py-2 text-foreground transition-colors hover:bg-muted ${focusRing}`}
            >
              <Text as="span" intent="button" weight="medium" color="inherit">
                Try Opening Sign-In Again
              </Text>
            </button>
          )}
          <Text
            as={Link}
            to={declineHref}
            intent="button"
            weight="medium"
            color="mutedForeground"
            className={`inline-flex items-center justify-center rounded-button border border-border bg-transparent px-5 py-2.5 transition-colors hover:bg-muted ${focusRing}`}
          >
            Cancel
          </Text>
        </div>
      </div>
    </div>
  )
}
