import { Link } from "react-router-dom"
import { XCircleIcon } from "lucide-react"
import { Text } from "@/components/typography/text"

interface GrantErrorStateProps {
  error?: string
  declineHref: string
}

export function GrantErrorState({ error, declineHref }: GrantErrorStateProps) {
  const focusRing =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-6">
      <div className="w-full max-w-[440px] rounded-card bg-background p-10 shadow-md">
        <div className="flex flex-col items-center space-y-6 text-center">
          <XCircleIcon aria-hidden="true" className="size-16 text-destructive" />
          <div className="space-y-3">
            <Text as="h1" intent="heading" weight="semi">
              Something Went Wrong
            </Text>
            <Text as="p" intent="body" color="mutedForeground">
              {error || "Please try again."}
            </Text>
          </div>
          <Text
            as={Link}
            to={declineHref}
            intent="button"
            weight="medium"
            color="inherit"
            className={`inline-flex items-center justify-center rounded-button bg-foreground px-6 py-3 text-background transition-colors hover:bg-foreground/90 ${focusRing}`}
          >
            Go to Your Data
          </Text>
        </div>
      </div>
    </div>
  )
}
