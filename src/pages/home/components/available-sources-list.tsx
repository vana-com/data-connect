import { useMemo } from "react"
import { LoaderIcon } from "lucide-react"
import { ActionButton } from "@/components/typography/action-button"
import { EyebrowBadge } from "@/components/typography/eyebrow-badge"
import { Text } from "@/components/typography/text"
import { SourceStack } from "@/components/elements/source-row"
import { cn } from "@/lib/classes"
import type { Platform, Run } from "@/types"
import {
  getConnectSourceEntries,
  getConnectSourceState,
  resolvePlatformForEntry,
} from "@/lib/platform/utils"
import { getPlatformPrimaryColor } from "@/lib/platform/ui"

interface AvailableSourcesListProps {
  platforms: Platform[]
  runs: Run[]
  onExport: (platform: Platform) => void
  connectedPlatformIds: string[]
}

export function AvailableSourcesList({
  platforms,
  runs,
  onExport,
  connectedPlatformIds,
}: AvailableSourcesListProps) {
  const connectEntries = getConnectSourceEntries()
  const connectedPlatformIdSet = useMemo(
    () => new Set(connectedPlatformIds),
    [connectedPlatformIds]
  )
  const connectingPlatformIds = useMemo(
    () =>
      new Set(
        runs.filter(run => run.status === "running").map(run => run.platformId)
      ),
    [runs]
  )

  return (
    <section className="space-y-gap">
      <Text as="h2" weight="medium">
        Connect sources
      </Text>
      <div className="grid grid-cols-2 gap-2 action-outset">
        {connectEntries
          .map(entry => {
            const platform = resolvePlatformForEntry(platforms, entry)
            if (platform && connectedPlatformIdSet.has(platform.id)) {
              return null
            }
            const state = getConnectSourceState(entry, platform)
            return {
              iconName: entry.displayName,
              label: `Connect ${entry.displayName}`,
              stackPrimaryColor: getPlatformPrimaryColor(entry),
              isAvailable: state === "available",
              isConnecting: platform
                ? connectingPlatformIds.has(platform.id)
                : false,
              onClick:
                state === "available" && platform
                  ? () => onExport(platform)
                  : undefined,
            }
          })
          .filter((card): card is NonNullable<typeof card> => card !== null)
          .map((card, index) => ({
            ...card,
            index,
            priority: card.isAvailable ? 0 : 1,
          }))
          .sort((a, b) => a.priority - b.priority || a.index - b.index)
          .map(
            ({
              iconName,
              label,
              stackPrimaryColor,
              isAvailable,
              isConnecting,
              onClick,
            }) => (
              <ActionButton
                key={label}
                onClick={onClick}
                disabled={!isAvailable || isConnecting}
                size="xl"
                className={cn(
                  "relative h-auto overflow-hidden p-0 disabled:opacity-100"
                )}
                aria-busy={isConnecting}
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
                {isConnecting ? (
                  <div
                    className={cn(
                      "absolute inset-0 flex items-center justify-center",
                      "bg-background/70"
                    )}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <LoaderIcon
                        className="size-4 animate-spin motion-reduce:animate-none"
                        aria-hidden="true"
                      />
                      Opening browser…
                    </span>
                  </div>
                ) : null}
              </ActionButton>
            )
          )}
      </div>
    </section>
  )
}
