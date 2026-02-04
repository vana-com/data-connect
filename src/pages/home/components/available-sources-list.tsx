import { ActionButton } from "@/components/typography/action-button"
import { EyebrowBadge } from "@/components/typography/eyebrow-badge"
import { Text } from "@/components/typography/text"
import { SourceStack } from "@/components/elements/source-row"
import { cn } from "@/lib/classes"
import type { Platform } from "@/types"
import {
  getConnectSourceEntries,
  getConnectSourceState,
  resolvePlatformForEntry,
} from "@/lib/platform/utils"
import { getPlatformPrimaryColor } from "@/lib/platform/ui"

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
        Connect sources
      </Text>
      <div className="grid grid-cols-2 gap-2 action-outset">
        {connectEntries
          .map(entry => {
            const platform = resolvePlatformForEntry(platforms, entry)
            const state = getConnectSourceState(entry, platform)
            return {
              iconName: entry.displayName,
              label: `Connect ${entry.displayName}`,
              stackPrimaryColor: getPlatformPrimaryColor(entry),
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
          .map(
            ({ iconName, label, stackPrimaryColor, isAvailable, onClick }) => (
              <ActionButton
                key={label}
                onClick={onClick}
                disabled={!isAvailable}
                size="xl"
                className={cn(
                  "h-auto p-0 overflow-hidden disabled:opacity-100"
                )}
              >
                <SourceStack
                  iconName={iconName}
                  label={label}
                  stackPrimaryColor={stackPrimaryColor}
                  showArrow={isAvailable}
                  trailingSlot={
                    isAvailable ? null : (
                      <EyebrowBadge
                        variant="outline"
                        className="text-foreground-muted"
                      >
                        soon
                      </EyebrowBadge>
                    )
                  }
                  labelColor={isAvailable ? "foreground" : "mutedForeground"}
                />
              </ActionButton>
            )
          )}
      </div>
    </section>
  )
}
