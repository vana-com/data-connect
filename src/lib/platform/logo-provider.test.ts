import { afterEach, describe, expect, it, vi } from "vitest"

async function importLogoProvider() {
  vi.resetModules()
  return import("./logo-provider")
}

describe("logo-provider", () => {
  afterEach(() => {
    vi.resetModules()
  })

  it("builds a Logo.dev URL with the publishable token and options", async () => {
    const { getPlatformLogoUrlForDomain } = await importLogoProvider()

    expect(
      getPlatformLogoUrlForDomain("linkedin.com", {
        size: 96,
        format: "png",
        theme: "dark",
        fallback: "404",
        retina: false,
      })
    ).toBe(
      "https://img.logo.dev/linkedin.com?token=pk_G3vpMXK4Qo620npMuBoMbQ&size=96&format=png&theme=dark&fallback=404&retina=false"
    )
  })

  it("returns no provider URL when the domain is blank", async () => {
    const { getPlatformLogoUrlForDomain } = await importLogoProvider()

    expect(getPlatformLogoUrlForDomain("")).toBeUndefined()
  })
})
