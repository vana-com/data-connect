import { describe, expect, it } from "vitest"
import { getAllAvailableScopes, getPlatformRegistryEntryById } from "./utils"
import { PLATFORM_REGISTRY } from "./registry"
import type { Platform } from "@/types"

const makePlatform = (overrides: Partial<Platform> & { id: string }): Platform => ({
  company: "",
  name: "",
  filename: "",
  description: "",
  isUpdated: false,
  logoURL: "",
  needsConnection: false,
  connectURL: null,
  connectSelector: null,
  exportFrequency: null,
  vectorize_config: null,
  ...overrides,
})

describe("getAllAvailableScopes", () => {
  it("falls back to registry ingestScopes when no platforms are provided", () => {
    const scopes = getAllAvailableScopes()

    const expectedScopes = PLATFORM_REGISTRY
      .filter(entry => Boolean(entry.ingestScope))
      .map(entry => entry.ingestScope as string)

    expect(scopes).toEqual(expectedScopes)
  })

  it("falls back to registry when platforms array is empty", () => {
    const scopes = getAllAvailableScopes([])

    const expectedScopes = PLATFORM_REGISTRY
      .filter(entry => Boolean(entry.ingestScope))
      .map(entry => entry.ingestScope as string)

    expect(scopes).toEqual(expectedScopes)
  })

  it("does not include entries without ingestScope in fallback", () => {
    const scopes = getAllAvailableScopes()

    // x, twitter, reddit, facebook, google, tiktok, youtube have no ingestScope
    expect(scopes).not.toContain(undefined)
    expect(scopes.every(s => typeof s === "string" && s.length > 0)).toBe(true)
  })

  it("includes known scopes from the registry in fallback", () => {
    const scopes = getAllAvailableScopes()

    expect(scopes).toContain("chatgpt.conversations")
    expect(scopes).toContain("instagram.posts")
    expect(scopes).toContain("github.profile")
    expect(scopes).toContain("linkedin.profile")
    expect(scopes).toContain("spotify.savedTracks")
  })

  it("returns scopes from loaded platforms when available", () => {
    const platforms = [
      makePlatform({
        id: "chatgpt",
        scopes: ["chatgpt.conversations", "chatgpt.memories"],
      }),
      makePlatform({
        id: "github",
        scopes: ["github.profile", "github.repositories"],
      }),
    ]

    const scopes = getAllAvailableScopes(platforms)

    expect(scopes).toContain("chatgpt.conversations")
    expect(scopes).toContain("chatgpt.memories")
    expect(scopes).toContain("github.profile")
    expect(scopes).toContain("github.repositories")
    expect(scopes).toHaveLength(4)
  })

  it("deduplicates scopes across platforms", () => {
    const platforms = [
      makePlatform({
        id: "chatgpt-v1",
        scopes: ["chatgpt.conversations"],
      }),
      makePlatform({
        id: "chatgpt-v2",
        scopes: ["chatgpt.conversations", "chatgpt.memories"],
      }),
    ]

    const scopes = getAllAvailableScopes(platforms)

    expect(scopes).toEqual(["chatgpt.conversations", "chatgpt.memories"])
  })

  it("falls back to registry when platforms have no scopes arrays", () => {
    const platforms = [
      makePlatform({ id: "chatgpt" }),
      makePlatform({ id: "github" }),
    ]

    const scopes = getAllAvailableScopes(platforms)

    // No scopes on platforms, so falls back to registry
    expect(scopes).toContain("chatgpt.conversations")
    expect(scopes).toContain("instagram.posts")
  })
})

describe("getPlatformRegistryEntryById", () => {
  it('resolves the generic "instagram" token to Instagram, not Instagram Ads', () => {
    expect(getPlatformRegistryEntryById("instagram")?.id).toBe("instagram")
  })

  it("still resolves Instagram Ads tokens to the Instagram Ads entry", () => {
    expect(getPlatformRegistryEntryById("instagram-ads")?.id).toBe(
      "instagram-ads"
    )
    expect(getPlatformRegistryEntryById("instagram-ads-playwright")?.id).toBe(
      "instagram-ads"
    )
  })
})
