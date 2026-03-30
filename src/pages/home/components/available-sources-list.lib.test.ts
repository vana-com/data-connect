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

vi.mock("@/lib/platform/logo-provider", () => ({
  getPlatformLogoUrlForDomain: (domain: string) =>
    `https://img.logo.dev/${domain}?mock`,
}))

vi.mock("@/lib/platform/registry", () => ({
  PLATFORM_REGISTRY: [
    {
      id: "test-coming-soon",
      displayName: "Test Coming Soon",
      brandDomain: "test-coming-soon.com",
      platformIds: ["test-coming-soon"],
      availability: "comingSoon",
    },
  ],
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

    const card = cards.find(c => c.cardId === "chatgpt")
    expect(card).toBeDefined()
    expect(card?.availability).toBe("requiresConnector")
    expect(card?.isAvailable).toBe(true)
  })

  it('sets availability to "comingSoon" and disables the card', () => {
    const cards = buildAvailableCards({
      platforms: [makePlatform("coming-soon-platform")],
      connectedPlatformIdSet: emptyConnected,
      connectingPlatforms: emptyConnecting,
      onExport,
    })

    const card = cards.find(c => c.cardId === "coming-soon-platform")
    expect(card).toBeDefined()
    expect(card?.availability).toBe("comingSoon")
    expect(card?.isAvailable).toBe(false)
    expect(card?.onClick).toBeUndefined()
  })

  it('sets availability to "available" and enables the card', () => {
    const cards = buildAvailableCards({
      platforms: [makePlatform("spotify")],
      connectedPlatformIdSet: emptyConnected,
      connectingPlatforms: emptyConnecting,
      onExport,
    })

    const card = cards.find(c => c.cardId === "spotify")
    expect(card).toBeDefined()
    expect(card?.availability).toBe("available")
    expect(card?.isAvailable).toBe(true)
    expect(card?.onClick).toBeDefined()
  })

  it('sets availability to "unknown" for platforms without a registry entry', () => {
    const cards = buildAvailableCards({
      platforms: [makePlatform("unregistered-platform")],
      connectedPlatformIdSet: emptyConnected,
      connectingPlatforms: emptyConnecting,
      onExport,
    })

    const card = cards.find(c => c.cardId === "unregistered-platform")
    expect(card).toBeDefined()
    expect(card?.availability).toBe("unknown")
    expect(card?.isAvailable).toBe(true)
  })

  it("preserves sort order: runtime platforms before injected registry entries", () => {
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

    expect(cards[0].cardId).toBe("spotify")
    expect(cards[1].cardId).toBe("coming-soon-platform")
    expect(cards[2].cardId).toBe("chatgpt")
    // Injected registry entries appear after runtime platforms
    const injectedIdx = cards.findIndex(c => c.cardId === "test-coming-soon")
    expect(injectedIdx).toBeGreaterThan(2)
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

  it("injects comingSoon registry entries that have no matching runtime platform", () => {
    const cards = buildAvailableCards({
      platforms: [makePlatform("chatgpt")],
      connectedPlatformIdSet: emptyConnected,
      connectingPlatforms: emptyConnecting,
      onExport,
    })

    const injectedCard = cards.find(c => c.cardId === "test-coming-soon")
    expect(injectedCard).toBeDefined()
    expect(injectedCard?.availability).toBe("comingSoon")
    expect(injectedCard?.isAvailable).toBe(false)
    expect(injectedCard?.onClick).toBeUndefined()
    expect(injectedCard?.iconImageSrc).toBe(
      "https://img.logo.dev/test-coming-soon.com?mock"
    )
  })

  it("does not duplicate a comingSoon entry already present as a runtime platform", () => {
    const cards = buildAvailableCards({
      platforms: [makePlatform("test-coming-soon")],
      connectedPlatformIdSet: emptyConnected,
      connectingPlatforms: emptyConnecting,
      onExport,
    })

    const matchingCards = cards.filter(c => c.cardId === "test-coming-soon")
    expect(matchingCards).toHaveLength(1)
  })
})
