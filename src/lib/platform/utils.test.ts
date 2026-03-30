import { describe, expect, it } from "vitest"
import { getAllAvailableScopes } from "./utils"
import { PLATFORM_REGISTRY } from "./registry"

describe("getAllAvailableScopes", () => {
  it("returns only entries that have an ingestScope defined", () => {
    const scopes = getAllAvailableScopes()

    const expectedScopes = PLATFORM_REGISTRY
      .filter(entry => Boolean(entry.ingestScope))
      .map(entry => entry.ingestScope as string)

    expect(scopes).toEqual(expectedScopes)
  })

  it("does not include entries without ingestScope", () => {
    const scopes = getAllAvailableScopes()

    // x, twitter, reddit, facebook, google, tiktok, youtube have no ingestScope
    expect(scopes).not.toContain(undefined)
    expect(scopes.every(s => typeof s === "string" && s.length > 0)).toBe(true)
  })

  it("includes known scopes from the registry", () => {
    const scopes = getAllAvailableScopes()

    expect(scopes).toContain("chatgpt.conversations")
    expect(scopes).toContain("instagram.posts")
    expect(scopes).toContain("github.profile")
    expect(scopes).toContain("linkedin.profile")
    expect(scopes).toContain("spotify.savedTracks")
  })
})
