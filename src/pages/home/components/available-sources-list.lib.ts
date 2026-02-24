import { getPlatformPrimaryColor } from "@/lib/platform/ui"
import {
  getConnectSourceEntries,
  getConnectSourceState,
  resolvePlatformForEntry,
} from "@/lib/platform/utils"
import type { Platform, Run } from "@/types"

export interface AvailableSourceCard {
  cardId: string
  iconName: string
  label: string
  stackPrimaryColor: string
  isAvailable: boolean
  isConnecting: boolean
  connectingStatusMessage?: string
  connectingRun?: Run
  onClick?: () => void
  priority: number
  index: number
}

interface BuildAvailableCardsInput {
  connectEntries: ReturnType<typeof getConnectSourceEntries>
  platforms: Platform[]
  connectedPlatformIdSet: Set<string>
  connectingPlatforms: Map<string, Run>
  onExport: (platform: Platform) => void
}

export function buildAvailableCards({
  connectEntries,
  platforms,
  connectedPlatformIdSet,
  connectingPlatforms,
  onExport,
}: BuildAvailableCardsInput): AvailableSourceCard[] {
  const cards: AvailableSourceCard[] = []

  connectEntries.forEach((entry, index) => {
    const platform = resolvePlatformForEntry(platforms, entry)
    if (platform && connectedPlatformIdSet.has(platform.id)) return

    const state = getConnectSourceState(entry, platform)
    const baseConnectingRun = platform
      ? connectingPlatforms.get(platform.id)
      : undefined
    const isConnecting = Boolean(platform && connectingPlatforms.has(platform.id))

    cards.push({
      cardId: platform?.id ?? entry.id,
      iconName: entry.displayName,
      label: `Connect ${entry.displayName}`,
      stackPrimaryColor: getPlatformPrimaryColor(entry),
      isAvailable: state === "available",
      isConnecting,
      connectingStatusMessage: baseConnectingRun?.statusMessage,
      connectingRun: baseConnectingRun,
      onClick:
        state === "available" && platform ? () => onExport(platform) : undefined,
      priority: state === "available" ? 0 : 1,
      index,
    })
  })

  cards.sort((a, b) => a.priority - b.priority || a.index - b.index)
  return cards
}
