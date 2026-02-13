import {
  ActionButton,
  ActionPanel,
} from "@/components/typography/button-action"
import { Text } from "@/components/typography/text"
import { SourceRow } from "@/components/elements/source-row"
import { cn } from "@/lib/classes"
import { getLastRunLabel } from "@/lib/platform/ui"
import type { Platform, Run } from "@/types"

interface ConnectedSourcesListProps {
  platforms: Platform[]
  runs: Run[]
  headline?: string
  onOpenRuns?: (platform: Platform) => void
}

export function ConnectedSourcesList({
  platforms,
  runs,
  headline = "Your sources at the moment.",
  onOpenRuns,
}: ConnectedSourcesListProps) {
  if (platforms.length === 0) {
    return (
      <section className="space-y-gap">
        <Text as="h2" weight="medium">
          {headline}
        </Text>
        <div className="action-outset">
          <ActionPanel>
            <Text muted>No sources yet</Text>
          </ActionPanel>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-gap">
      <Text as="h2" weight="medium">
        {headline}
      </Text>
      <div className="flex flex-col gap-3 action-outset">
        {platforms.map(platform => {
          const meta = getLastRunLabel(runs, platform.id)
          return (
            <ActionButton
              key={platform.id}
              onClick={onOpenRuns ? () => onOpenRuns(platform) : undefined}
              size="xl"
              className={cn("items-start justify-between text-left")}
            >
              <SourceRow
                iconName={platform.name}
                label={platform.name}
                meta={meta}
              />
            </ActionButton>
          )
        })}
      </div>
    </section>
  )
}
