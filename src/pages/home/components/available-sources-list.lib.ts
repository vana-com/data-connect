import { getPlatformPrimaryColor } from "@/lib/platform/ui"
import { getPlatformRegistryEntry } from "@/lib/platform/utils"
import type { Platform, Run } from "@/types"

export interface AvailableSourceCard {
  cardId: string
  iconName: string
  iconImageSrc?: string
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

    const iconImageSrc = platform.logoURL?.startsWith("data:")
      ? platform.logoURL
      : undefined

    cards.push({
      cardId: platform.id,
      iconName: displayName,
      iconImageSrc,
      label: `Connect ${displayName}`,
      stackPrimaryColor: getPlatformPrimaryColor(entry),
      isAvailable: true,
      isConnecting,
      connectingStatusMessage: baseConnectingRun?.statusMessage,
      connectingRun: baseConnectingRun,
      onClick: () => onExport(platform),
      priority: isConnecting ? 0 : 1,
      index,
    })
  })

  cards.sort((a, b) => a.priority - b.priority || a.index - b.index)
  return cards
}
