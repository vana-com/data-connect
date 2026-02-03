import { Link } from "react-router-dom"
import { CheckCircleIcon } from "lucide-react"
import { Text } from "@/components/typography/text"

interface GrantSuccessStateProps {
  appName?: string
  declineHref: string
}

export function GrantSuccessState({ appName, declineHref }: GrantSuccessStateProps) {
  const focusRing =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-6">
      <div className="w-full max-w-[440px] rounded-card bg-background p-10 shadow-md">
        <div className="flex flex-col items-center space-y-6 text-center">
          <CheckCircleIcon aria-hidden="true" className="size-16 text-success" />
          <div className="space-y-2">
            <Text as="h1" intent="heading" weight="semi">
              Access Granted
            </Text>
            <Text as="p" intent="body" color="mutedForeground">
              You've successfully granted <strong>{appName || "the app"}</strong> access
              to your data.
            </Text>
            <Text as="p" intent="small" color="mutedForeground">
              You can manage this connection in Settings anytime.
            </Text>
          </div>
          <Text
            as={Link}
            to={declineHref}
            intent="button"
            weight="medium"
            color="inherit"
            className={`inline-flex items-center justify-center rounded-button bg-accent px-6 py-3 text-background transition-colors hover:bg-accent/90 ${focusRing}`}
          >
            Done
          </Text>
        </div>
      </div>
    </div>
  )
}
