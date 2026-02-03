import { DatabaseIcon, PlusIcon } from "lucide-react"
import { Text } from "@/components/typography/text"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/classes"
import type { Platform } from "@/types"
import { getPlatformDisplay } from "../utils"

interface AvailableSourcesSectionProps {
  availableSources: Platform[]
  hasConnectedSources: boolean
  onConnect: (platformId: string) => void
}

export function AvailableSourcesSection({
  availableSources,
  hasConnectedSources,
  onConnect,
}: AvailableSourcesSectionProps) {
  return (
    <section className="space-y-4">
      <Text as="h2" intent="heading" weight="semi">
        {hasConnectedSources ? "Add more sources" : "Connect your data sources"}
      </Text>
      {availableSources.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {availableSources.map(platform => {
            const display = getPlatformDisplay(platform)
            return (
              <Button
                key={platform.id}
                type="button"
                variant="outline"
                onClick={() => onConnect(platform.id)}
                className="h-auto w-full justify-start gap-4 px-5 py-4 text-left"
              >
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
                  <Text as="div" intent="fine" color="mutedForeground">
                    {platform.description}
                  </Text>
                </div>
                <PlusIcon aria-hidden="true" className="size-5 text-accent" />
              </Button>
            )
          })}
        </div>
      ) : (
        <div className="rounded-card border border-border bg-background p-12 text-center">
          <DatabaseIcon
            aria-hidden="true"
            className="mx-auto size-12 text-muted-foreground"
          />
          <Text as="p" intent="small" color="mutedForeground" className="mt-4">
            No available data sources
          </Text>
        </div>
      )}
    </section>
  )
}
