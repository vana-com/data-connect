import { getPlatformRegistryEntry } from "@/lib/platform/utils"
import { resolvePlatformLogo } from "@/lib/platform/resolve-platform-logo"
import {
  PLATFORM_REGISTRY,
  type PlatformRegistryAvailability,
} from "@/lib/platform/registry"
import { getPlatformLogoUrlForDomain } from "@/lib/platform/logo-provider"
import type { Platform, Run } from "@/types"

export type CardAvailability = PlatformRegistryAvailability | "unknown"

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
  availability: CardAvailability
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
    const availability: CardAvailability = entry?.availability ?? "unknown"
    const isCardAvailable = availability !== "comingSoon"

    const iconImageSrc = resolvePlatformLogo(platform, entry)

    cards.push({
      cardId: platform.id,
      iconName: displayName,
      iconImageSrc,
      label: `Connect ${displayName}`,
      isAvailable: isCardAvailable,
      isConnecting,
      connectingStatusMessage: baseConnectingRun?.statusMessage,
      connectingRun: baseConnectingRun,
      onClick: isCardAvailable ? () => onExport(platform) : undefined,
      index,
      availability,
    })
  })

  // Inject registry-only "comingSoon" entries that have no matching runtime platform
  const existingCardIds = new Set(cards.map(c => c.cardId))

  PLATFORM_REGISTRY.filter(
    entry => entry.availability === "comingSoon"
  ).forEach(entry => {
    // Skip if a card already exists for any of this entry's platform IDs or its own ID
    const allIds = [entry.id, ...(entry.platformIds ?? [])]
    if (allIds.some(id => existingCardIds.has(id))) return

    const iconImageSrc = entry.brandDomain
      ? getPlatformLogoUrlForDomain(entry.brandDomain, { theme: "dark" })
      : undefined

    cards.push({
      cardId: entry.id,
      iconName: entry.displayName,
      iconImageSrc,
      label: `Connect ${entry.displayName}`,
      isAvailable: false,
      isConnecting: false,
      onClick: undefined,
      index: cards.length,
      availability: "comingSoon",
    })
  })

  cards.sort((a, b) => a.index - b.index)
  return cards
}
