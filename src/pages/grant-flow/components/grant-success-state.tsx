import { Link } from "react-router-dom"
import { CheckCircleIcon } from "lucide-react"
import { Text } from "@/components/typography/text"
import { Button } from "@/components/ui/button"

interface GrantSuccessStateProps {
  appName?: string
  declineHref: string
}

export function GrantSuccessState({ appName, declineHref }: GrantSuccessStateProps) {
  return (
    <div className="grid min-h-screen place-items-center bg-muted p-6">
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
          <Button asChild variant="accent">
            <Link to={declineHref}>Done</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
