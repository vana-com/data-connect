import { getPlatformRegistryEntry } from "@/lib/platform/utils"
import { resolvePlatformLogo } from "@/lib/platform/resolve-platform-logo"
import type { Platform, Run } from "@/types"

export interface AvailableSourceCard {
  cardId: string
  iconName: string
  iconImageSrc?: string
  label: string
  isAvailable: boolean
  isConnecting: boolean
  connectingStatusMessage?: string
  connectingRun?: Run
  onClick?: () => void
  index: number
}

interface BuildAvailableCardsInput {
  platforms: Platform[]
  connectedPlatformIdSet: Set<string>
  connectingPlatforms: Map<string, Run>
  onExport: (platform: Platform) => void
}

export function buildAvailableCards({
  platforms,
  connectedPlatformIdSet,
  connectingPlatforms,
  onExport,
}: BuildAvailableCardsInput): AvailableSourceCard[] {
  const cards: AvailableSourceCard[] = []

  platforms.forEach((platform, index) => {
    if (connectedPlatformIdSet.has(platform.id)) return

    const entry = getPlatformRegistryEntry(platform)
    const displayName = entry?.displayName ?? platform.name
    const baseConnectingRun = connectingPlatforms.get(platform.id)
    const isConnecting = connectingPlatforms.has(platform.id)

    const iconImageSrc = resolvePlatformLogo(platform, entry)

    cards.push({
      cardId: platform.id,
      iconName: displayName,
      iconImageSrc,
      label: `Connect ${displayName}`,
      isAvailable: true,
      isConnecting,
      connectingStatusMessage: baseConnectingRun?.statusMessage,
      connectingRun: baseConnectingRun,
      onClick: () => onExport(platform),
      index,
    })
  })

  cards.sort((a, b) => a.index - b.index)
  return cards
}
