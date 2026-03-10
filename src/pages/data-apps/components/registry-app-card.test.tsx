import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { RegistryAppCard } from "./registry-app-card"

vi.mock("@/apps/external-url", () => ({
  openSubmittedAppExternalUrl: vi.fn(),
  parseSubmittedAppExternalUrl: (url: string) => new URL(url),
}))

describe("RegistryAppCard", () => {
  it("uses the same outer icon footprint on both sides of the flow", () => {
    const { container } = render(
      <RegistryAppCard
        app={{
          id: "peak-think",
          name: "Peak Think",
          icon: "P",
          description: "Correlate sleep patterns with ChatGPT conversations.",
          category: "Health",
          dataRequired: [{ token: "chatgpt", label: "ChatGPT" }],
          status: "live",
          externalUrl: "https://example.com",
          scopes: ["chatgpt.conversations"],
        }}
      />
    )

    const flow = container.querySelector('[data-slot="icon-flow"]')
    expect(flow).toBeTruthy()

    const adaptiveIcons = flow?.querySelectorAll('[data-slot="adaptive-icon"]')
    expect(adaptiveIcons).toHaveLength(2)
    expect(adaptiveIcons?.[1]?.className).not.toContain("p-1")
    expect((adaptiveIcons?.[0] as HTMLElement | undefined)?.style.width).toBe(
      "32px"
    )
    expect((adaptiveIcons?.[1] as HTMLElement | undefined)?.style.width).toBe(
      "32px"
    )
  })

  it("shows the category badge without repeating platform badges", () => {
    render(
      <RegistryAppCard
        app={{
          id: "peak-think",
          name: "Peak Think",
          icon: "P",
          description: "Correlate sleep patterns with ChatGPT conversations.",
          category: "Health",
          dataRequired: [{ token: "chatgpt", label: "ChatGPT" }],
          status: "live",
          externalUrl: "https://example.com",
          scopes: ["chatgpt.conversations"],
        }}
      />
    )

    expect(screen.getAllByText("Health").length).toBeGreaterThan(0)
    expect(screen.queryByText("ChatGPT")).toBeNull()
    expect(screen.queryByText("Open app")).toBeNull()
  })

  it("renders builder attribution when provided", () => {
    render(
      <RegistryAppCard
        app={{
          id: "peak-think",
          name: "Peak Think",
          icon: "P",
          builderName: "Ada Lovelace",
          builderUrl: "https://example.com/ada",
          description: "Correlate sleep patterns with ChatGPT conversations.",
          category: "Health",
          dataRequired: [{ token: "chatgpt", label: "ChatGPT" }],
          status: "live",
          externalUrl: "https://example.com",
          scopes: ["chatgpt.conversations"],
        }}
      />
    )

    expect(screen.getByText(/by/i)).toBeTruthy()
    expect(
      screen.getByText(content => content.includes("Ada Lovelace"))
    ).toBeTruthy()
  })

  it("shows the coming soon badge in the top metadata row", () => {
    render(
      <RegistryAppCard
        app={{
          id: "future-think",
          name: "Future Think",
          icon: "F",
          description: "An upcoming app.",
          category: "AI",
          dataRequired: [{ token: "linkedin", label: "LinkedIn" }],
          status: "coming-soon",
          scopes: ["linkedin.profile"],
        }}
      />
    )

    expect(screen.getAllByText("AI").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Coming Soon").length).toBeGreaterThan(0)
  })

  it("derives provider-backed platform logos from scope tokens", () => {
    const { container } = render(
      <RegistryAppCard
        app={{
          id: "macrocart",
          name: "MacroCart",
          icon: "M",
          description: "Track nutrition from Amazon and Shop orders.",
          category: "Nutrition",
          dataRequired: [
            { token: "amazon", label: "Amazon" },
            { token: "shop", label: "Shop" },
          ],
          status: "live",
          externalUrl: "https://example.com",
          scopes: ["amazon.orders", "shop.orders"],
        }}
      />
    )

    const imageSources = Array.from(container.querySelectorAll("img")).map(image =>
      image.getAttribute("src")
    )

    expect(
      imageSources.some(src => src?.startsWith("https://img.logo.dev/amazon.com?"))
    ).toBe(true)
    expect(
      imageSources.some(src => src?.startsWith("https://img.logo.dev/shop.app?"))
    )
      .toBe(true)
  })
})
