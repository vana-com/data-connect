import { Text } from "@/components/typography/text"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/classes"
import type { Platform } from "@/types"
import { getPlatformDisplay } from "../utils"

interface ConnectedSourcesSectionProps {
  connectedSources: Platform[]
  onViewRuns: () => void
}

export function ConnectedSourcesSection({
  connectedSources,
  onViewRuns,
}: ConnectedSourcesSectionProps) {
  if (connectedSources.length === 0) {
    return null
  }

  return (
    <section className="space-y-gap">
      <Text as="h2" intent="heading" weight="semi">
        Connected sources
      </Text>
      <div className="grid gap-4 md:grid-cols-2">
        {connectedSources.map(platform => {
          const display = getPlatformDisplay(platform)
          return (
            <div
              key={platform.id}
              className="rounded-card border border-border bg-background p-5"
            >
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "flex size-12 items-center justify-center rounded-card",
                    display.iconClassName
                  )}
                >
                  <Text as="span" intent="subtitle" inline>
                    {display.icon}
                  </Text>
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <Text as="div" intent="small" weight="semi" truncate>
                    {display.displayName || platform.name}
                  </Text>
                  <Text as="div" intent="fine" color="success">
                    Connected
                  </Text>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onViewRuns}
                >
                  View
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
