import { Link } from "react-router-dom"
import { LoaderIcon } from "lucide-react"
import { Text } from "@/components/typography/text"
import { Button } from "@/components/ui/button"

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
  return (
    <div className="grid min-h-screen place-items-center bg-muted p-6">
      <div className="w-full max-w-[440px] rounded-card bg-background p-10 shadow-md">
        <div className="flex flex-col items-center space-y-6 text-center">
          <LoaderIcon
            aria-hidden="true"
            className="size-12 animate-spin text-accent motion-reduce:animate-none"
          />
          <div className="space-y-3">
            <Text as="h1" intent="heading">
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
              <Button
                type="button"
                onClick={() => window.open(authUrl, "_blank", "noopener,noreferrer")}
                fullWidth
                className="hover:bg-foreground/90"
              >
                Open Sign-In Page
              </Button>
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
            <Button
              type="button"
              onClick={onRetryAuth}
              variant="outline"
              fullWidth
              className="border-border hover:bg-muted"
            >
              Try Opening Sign-In Again
            </Button>
          )}
          <Button
            asChild
            variant="outline"
            className="border-border bg-transparent px-5 py-2.5 hover:bg-muted"
          >
            <Link to={declineHref}>Cancel</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
