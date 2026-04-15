import { describe, expect, it } from "vitest"
import { PLATFORM_REGISTRY } from "./registry"
import connectorRegistry from "../../../connectors/registry.json"

/**
 * These tests verify that the frontend PLATFORM_REGISTRY stays in sync
 * with the bundled connector registry (connectors/registry.json).
 *
 * BUI-296: Spotify connector must define spotify.savedTracks
 * BUI-297: Shop connector must exist and define shop.orders
 */

const connectorIds = connectorRegistry.connectors.map((c) => c.id)

const entriesWithConnectors = PLATFORM_REGISTRY.filter(
  (entry) => entry.availability === "requiresConnector"
)

const entriesComingSoon = PLATFORM_REGISTRY.filter(
  (entry) => entry.availability === "comingSoon"
)

describe("PLATFORM_REGISTRY / connector registry alignment", () => {
  it("every requiresConnector entry references at least one bundled connector", () => {
    for (const entry of entriesWithConnectors) {
      const playwrightIds =
        entry.platformIds?.filter((id) => id.endsWith("-playwright")) ?? []
      const hasMatch = playwrightIds.some((id) => connectorIds.includes(id))
      expect(
        hasMatch,
        `${entry.id}: no bundled connector for platformIds ${JSON.stringify(playwrightIds)}`
      ).toBe(true)
    }
  })

  it("every requiresConnector entry has an ingestScope", () => {
    for (const entry of entriesWithConnectors) {
      expect(
        entry.ingestScope,
        `${entry.id}: missing ingestScope`
      ).toBeTruthy()
    }
  })

  it("comingSoon entries do NOT have ingestScope or showInConnectList", () => {
    for (const entry of entriesComingSoon) {
      expect(
        entry.ingestScope,
        `${entry.id}: comingSoon entry should not have ingestScope`
      ).toBeUndefined()
      expect(
        entry.showInConnectList,
        `${entry.id}: comingSoon entry should not have showInConnectList`
      ).toBeUndefined()
    }
  })

  it("no duplicate registry ids", () => {
    const ids = PLATFORM_REGISTRY.map((e) => e.id)
    expect(ids).toEqual([...new Set(ids)])
  })
})

describe("BUI-296: Spotify connector supports spotify.savedTracks", () => {
  it("spotify entry has ingestScope spotify.savedTracks", () => {
    const spotify = PLATFORM_REGISTRY.find((e) => e.id === "spotify")
    expect(spotify).toBeDefined()
    expect(spotify!.ingestScope).toBe("spotify.savedTracks")
  })

  it("spotify-playwright connector exists in bundled registry", () => {
    expect(connectorIds).toContain("spotify-playwright")
  })
})

describe("BUI-297: Shop connector supports shop.orders", () => {
  it("shop entry has ingestScope shop.orders", () => {
    const shop = PLATFORM_REGISTRY.find((e) => e.id === "shop")
    expect(shop).toBeDefined()
    expect(shop!.ingestScope).toBe("shop.orders")
  })

  it("shop-playwright connector exists in bundled registry", () => {
    expect(connectorIds).toContain("shop-playwright")
  })

  it("there is no amazon entry in PLATFORM_REGISTRY (no frontend support yet)", () => {
    const amazon = PLATFORM_REGISTRY.find((e) => e.id === "amazon")
    expect(amazon).toBeUndefined()
  })
})

describe("Legacy metadata fallback connectors", () => {
  it("includes H-E-B with the expected connect surface metadata", () => {
    const heb = PLATFORM_REGISTRY.find((entry) => entry.id === "heb")
    expect(heb).toBeDefined()
    expect(heb?.brandDomain).toBe("heb.com")
    expect(heb?.ingestScope).toBe("heb.orders")
    expect(heb?.showInConnectList).toBe(true)
  })

  it("includes Whole Foods Market with the expected connect surface metadata", () => {
    const wholeFoods = PLATFORM_REGISTRY.find(
      (entry) => entry.id === "wholefoods"
    )
    expect(wholeFoods).toBeDefined()
    expect(wholeFoods?.brandDomain).toBe("wholefoodsmarket.com")
    expect(wholeFoods?.ingestScope).toBe("wholefoods.orders")
    expect(wholeFoods?.showInConnectList).toBe(true)
  })
})
