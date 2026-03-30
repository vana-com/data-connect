import { describe, expect, it, vi } from "vitest"
import type { Platform } from "@/types"
import { buildAvailableCards } from "./available-sources-list.lib"

vi.mock("@/lib/platform/utils", () => ({
  getPlatformRegistryEntry: (platform: { id?: string }) => {
    const entries: Record<string, { displayName: string; availability?: string; brandDomain?: string }> = {
      chatgpt: {
        displayName: "ChatGPT",
        availability: "requiresConnector",
        brandDomain: "chatgpt.com",
      },
      "coming-soon-platform": {
        displayName: "Coming Soon Platform",
        availability: "comingSoon",
        brandDomain: "example.com",
      },
      spotify: {
        displayName: "Spotify",
        availability: "available",
        brandDomain: "spotify.com",
      },
    }
    return platform.id ? entries[platform.id] ?? null : null
  },
}))

vi.mock("@/lib/platform/resolve-platform-logo", () => ({
  resolvePlatformLogo: () => undefined,
}))

function makePlatform(id: string, overrides: Partial<Platform> = {}): Platform {
  return {
    id,
    company: id,
    name: id,
    filename: id,
    description: `${id} connector`,
    isUpdated: false,
    logoURL: "",
    needsConnection: true,
    connectURL: null,
    connectSelector: null,
    exportFrequency: null,
    vectorize_config: null,
    runtime: null,
    ...overrides,
  }
}

describe("buildAvailableCards — availability", () => {
  const onExport = vi.fn()
  const emptyConnected = new Set<string>()
  const emptyConnecting = new Map()

  it('sets availability to "requiresConnector" for platforms with that registry entry', () => {
    const cards = buildAvailableCards({
      platforms: [makePlatform("chatgpt")],
      connectedPlatformIdSet: emptyConnected,
      connectingPlatforms: emptyConnecting,
      onExport,
    })

    expect(cards).toHaveLength(1)
    expect(cards[0].availability).toBe("requiresConnector")
    expect(cards[0].isAvailable).toBe(true)
  })

  it('sets availability to "comingSoon" and disables the card', () => {
    const cards = buildAvailableCards({
      platforms: [makePlatform("coming-soon-platform")],
      connectedPlatformIdSet: emptyConnected,
      connectingPlatforms: emptyConnecting,
      onExport,
    })

    expect(cards).toHaveLength(1)
    expect(cards[0].availability).toBe("comingSoon")
    expect(cards[0].isAvailable).toBe(false)
    expect(cards[0].onClick).toBeUndefined()
  })

  it('sets availability to "available" and enables the card', () => {
    const cards = buildAvailableCards({
      platforms: [makePlatform("spotify")],
      connectedPlatformIdSet: emptyConnected,
      connectingPlatforms: emptyConnecting,
      onExport,
    })

    expect(cards).toHaveLength(1)
    expect(cards[0].availability).toBe("available")
    expect(cards[0].isAvailable).toBe(true)
    expect(cards[0].onClick).toBeDefined()
  })

  it('sets availability to "unknown" for platforms without a registry entry', () => {
    const cards = buildAvailableCards({
      platforms: [makePlatform("unregistered-platform")],
      connectedPlatformIdSet: emptyConnected,
      connectingPlatforms: emptyConnecting,
      onExport,
    })

    expect(cards).toHaveLength(1)
    expect(cards[0].availability).toBe("unknown")
    expect(cards[0].isAvailable).toBe(true)
  })

  it("preserves sort order across different availability statuses", () => {
    const cards = buildAvailableCards({
      platforms: [
        makePlatform("spotify"),
        makePlatform("coming-soon-platform"),
        makePlatform("chatgpt"),
      ],
      connectedPlatformIdSet: emptyConnected,
      connectingPlatforms: emptyConnecting,
      onExport,
    })

    expect(cards).toHaveLength(3)
    expect(cards[0].cardId).toBe("spotify")
    expect(cards[1].cardId).toBe("coming-soon-platform")
    expect(cards[2].cardId).toBe("chatgpt")
  })

  it("does not produce an onClick handler for comingSoon platforms", () => {
    const cards = buildAvailableCards({
      platforms: [makePlatform("coming-soon-platform"), makePlatform("chatgpt")],
      connectedPlatformIdSet: emptyConnected,
      connectingPlatforms: emptyConnecting,
      onExport,
    })

    const comingSoonCard = cards.find(c => c.cardId === "coming-soon-platform")
    const availableCard = cards.find(c => c.cardId === "chatgpt")

    expect(comingSoonCard?.onClick).toBeUndefined()
    expect(availableCard?.onClick).toBeDefined()

    availableCard?.onClick?.()
    expect(onExport).toHaveBeenCalledWith(
      expect.objectContaining({ id: "chatgpt" })
    )
  })
})
