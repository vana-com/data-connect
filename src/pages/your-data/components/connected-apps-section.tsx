import { DatabaseIcon, ExternalLinkIcon } from "lucide-react"
import { Text } from "@/components/typography/text"
import { Button } from "@/components/ui/button"

export function ConnectedAppsSection() {
  return (
    <div className="rounded-card border border-border bg-background p-12 text-center">
      <DatabaseIcon
        aria-hidden="true"
        className="mx-auto size-12 text-muted-foreground"
      />
      <Text as="h3" intent="heading" weight="semi" className="mt-4">
        No connected apps yet
      </Text>
      <Text as="p" intent="small" color="mutedForeground" className="mt-2">
        Apps that you authorize to access your data will appear here
      </Text>
      <Button asChild variant="outline" className="mt-6">
        <a href="https://docs.vana.org" target="_blank" rel="noopener noreferrer">
          Learn more
          <ExternalLinkIcon aria-hidden="true" className="size-4" />
        </a>
      </Button>
    </div>
  )
}
