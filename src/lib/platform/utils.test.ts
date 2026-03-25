import { describe, expect, it } from "vitest"
import { resolvePlatformForEntry, getPlatformRegistryEntryById } from "./utils"

describe("platform registry resolution", () => {
  it("treats x-playwright as the canonical X connector", () => {
    const entry = getPlatformRegistryEntryById("x-playwright")

    expect(entry).toMatchObject({
      id: "x",
      displayName: "X",
      ingestScope: "x.posts",
    })
  })

  it("keeps legacy twitter lookups pointed at the canonical X entry", () => {
    const entry = getPlatformRegistryEntryById("twitter")

    expect(entry).toMatchObject({
      id: "x",
      displayName: "X",
    })
  })

  it("resolves the runtime x-playwright platform for the X entry", () => {
    const entry = getPlatformRegistryEntryById("x")

    expect(entry).toBeTruthy()
    if (!entry) {
      throw new Error("Expected X entry to exist")
    }

    const resolved = resolvePlatformForEntry(
      [
        {
          id: "x-playwright",
          company: "X",
          name: "X",
          filename: "x-playwright",
          description: "X export",
          isUpdated: false,
          logoURL: "",
          needsConnection: true,
          connectURL: null,
          connectSelector: null,
          exportFrequency: null,
          vectorize_config: null,
          runtime: "playwright",
        },
      ],
      entry
    )

    expect(resolved?.id).toBe("x-playwright")
  })
})
