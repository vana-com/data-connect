import { Link } from "react-router-dom"
import { XCircleIcon } from "lucide-react"
import { Text } from "@/components/typography/text"
import { Button } from "@/components/ui/button"

interface GrantErrorStateProps {
  error?: string
  declineHref: string
}

export function GrantErrorState({ error, declineHref }: GrantErrorStateProps) {
  return (
    <div className="grid min-h-screen place-items-center bg-muted p-6">
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
          <Button asChild variant="default">
            <Link to={declineHref}>Go to Your Data</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
