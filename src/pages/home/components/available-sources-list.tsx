import { ActionButton } from "@/components/typography/action-button"
import { Text } from "@/components/typography/text"
import { SourceStack } from "@/components/elements/source-row"
import { cn } from "@/lib/classes"
import type { Platform } from "@/types"
import {
  getConnectSourceEntries,
  getConnectSourceState,
  resolvePlatformForEntry,
} from "@/lib/platform/utils"

interface AvailableSourcesListProps {
  platforms: Platform[]
  onExport: (platform: Platform) => void
}

export function AvailableSourcesList({
  platforms,
  onExport,
}: AvailableSourcesListProps) {
  const connectEntries = getConnectSourceEntries()

  return (
    <section className="space-y-gap">
      <Text as="h2" weight="medium">
        Connect sources (more coming soon)
      </Text>
      <div className="grid grid-cols-2 gap-2 action-outset">
        {connectEntries
          .map(entry => {
            const platform = resolvePlatformForEntry(platforms, entry)
            const state = getConnectSourceState(entry, platform)
            return {
              iconName: entry.displayName,
              label: `Connect ${entry.displayName}`,
              isAvailable: state === "available",
              onClick:
                state === "available" && platform
                  ? () => onExport(platform)
                  : undefined,
            }
          })
          .map((card, index) => ({
            ...card,
            index,
            priority: card.isAvailable ? 0 : 1,
          }))
          .sort((a, b) => a.priority - b.priority || a.index - b.index)
          .map(({ iconName, label, isAvailable, onClick }) => (
            <ActionButton
              key={label}
              onClick={onClick}
              disabled={!isAvailable}
              size="xl"
              className={cn(
                "h-auto py-4",
                "items-start justify-between text-left"
                // isAvailable &&
                //   "hover:border-accent hover:shadow-[0_2px_8px_rgba(99,102,241,0.1)]"
              )}
            >
              <SourceStack
                iconName={iconName}
                label={label}
                showArrow={isAvailable}
                iconClassName={cn(!isAvailable && "opacity-70")}
                labelColor={isAvailable ? "foreground" : "mutedForeground"}
              />
            </ActionButton>
          ))}
      </div>
    </section>
  )
}
