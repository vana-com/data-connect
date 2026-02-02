import { ActionButton, ActionPanel } from "@/components/typography/action-button"
import { Text } from "@/components/typography/text"
import { SourceRow } from "@/components/elements/source-row"
import { cn } from "@/lib/classes"
import { getLastRunLabel, getPlatformIconComponent } from "@/lib/platform-ui"
import type { Platform, Run } from "@/types"

interface ConnectedSourcesListProps {
  platforms: Platform[]
  runs: Run[]
  onOpenRuns?: (platform: Platform) => void
}

export function ConnectedSourcesList({
  platforms,
  runs,
  onOpenRuns,
}: ConnectedSourcesListProps) {
  if (platforms.length === 0) {
    return (
      <section className="space-y-4">
        <Text as="h2" intent="body">
          Your sources
        </Text>
        <ActionPanel>
          <Text as="p" intent="small" color="mutedForeground">
            No sources yet.
          </Text>
        </ActionPanel>
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <Text as="h2" intent="body">
        Your sources
      </Text>
      <div className="flex flex-col gap-3">
        {platforms.map(platform => {
          const Icon = getPlatformIconComponent(platform)
          const meta = getLastRunLabel(runs, platform.id)
          return (
            <ActionButton
              key={platform.id}
              onClick={onOpenRuns ? () => onOpenRuns(platform) : undefined}
              className={cn("items-start justify-between gap-4", "text-left")}
            >
              <SourceRow layout="row" Icon={Icon} label={platform.name} meta={meta} />
            </ActionButton>
          )
        })}
      </div>
    </section>
  )
}
