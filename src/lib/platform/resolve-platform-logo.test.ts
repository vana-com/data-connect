import { afterEach, describe, expect, it, vi } from "vitest"
import type { Platform } from "@/types"
import type { PlatformRegistryEntry } from "./registry"

function makePlatform(overrides?: Partial<Platform>): Platform {
  return {
    id: "linkedin-playwright",
    company: "LinkedIn",
    name: "LinkedIn",
    filename: "linkedin-playwright",
    description: "LinkedIn export",
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

function makeEntry(overrides?: Partial<PlatformRegistryEntry>): PlatformRegistryEntry {
  return {
    id: "linkedin",
    displayName: "LinkedIn",
    brandDomain: "linkedin.com",
    ...overrides,
  }
}

describe("resolvePlatformLogo", () => {
  afterEach(() => {
    vi.resetModules()
  })

  it("prefers the connector-provided logo url over provider fallback", async () => {
    const { resolvePlatformLogo } = await importResolvePlatformLogo()

    expect(
      resolvePlatformLogo(
        makePlatform({ logoURL: "https://cdn.example.com/linkedin.svg" }),
        makeEntry()
      )
    ).toBe("https://cdn.example.com/linkedin.svg")
  })

  it("falls back to logo.dev when no connector logo url exists", async () => {
    const { resolvePlatformLogo } = await importResolvePlatformLogo()

    expect(resolvePlatformLogo(makePlatform(), makeEntry())).toBe(
      "https://img.logo.dev/linkedin.com?token=pk_G3vpMXK4Qo620npMuBoMbQ&size=64&format=webp&theme=dark&fallback=monogram&retina=true"
    )
  })
})

async function importResolvePlatformLogo() {
  vi.resetModules()
  return import("./resolve-platform-logo")
}
