import { Text } from "@/components/typography/text"
import {
  ConnectSourceCard,
  type ConnectSourceCardVariant,
} from "@/components/connect-source-card"
import type { Platform } from "@/types"
import {
  getConnectSourceEntries,
  getConnectSourceState,
  resolvePlatformForEntry,
} from "@/lib/platform/utils"
import { getPlatformIconComponentForEntry } from "@/lib/platform/icons"

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
    <section className="space-y-4">
      <Text as="h2" intent="body" weight="medium">
        Connect sources (more coming soon)
      </Text>
      <div className="grid grid-cols-2 gap-4">
        {connectEntries
          .map(entry => {
            const platform = resolvePlatformForEntry(platforms, entry)
            const state = getConnectSourceState(entry, platform)
            const Icon =
              getPlatformIconComponentForEntry(entry) ??
              (({ className }) => (
                <span className={className}>{entry.displayName.charAt(0)}</span>
              ))
            return {
              label: `Connect ${entry.displayName}`,
              Icon,
              state: state as ConnectSourceCardVariant,
              onClick:
                state === "available" && platform
                  ? () => onExport(platform)
                  : undefined,
            }
          })
          .map((card, index) => ({
            ...card,
            index,
            priority: card.state === "available" ? 0 : 1,
          }))
          .sort((a, b) => a.priority - b.priority || a.index - b.index)
          .map(({ label, Icon, state, onClick }) => (
            <ConnectSourceCard
              key={label}
              label={label}
              Icon={Icon}
              state={state}
              onClick={onClick}
            />
          ))}
      </div>
    </section>
  )
}
