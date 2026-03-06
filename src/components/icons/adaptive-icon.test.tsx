import { cleanup, fireEvent, render } from "@testing-library/react"
import { AsteriskIcon } from "lucide-react"
import { afterEach, describe, expect, it } from "vitest"
import { AdaptiveIcon } from "./adaptive-icon"

describe("AdaptiveIcon", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders the solid icon surface by default", () => {
    const { container } = render(<AdaptiveIcon icon={AsteriskIcon} />)

    const surface = container.querySelector(
      '[data-slot="adaptive-icon"]'
    ) as HTMLElement | null

    expect(surface).toBeTruthy()
    if (!surface) {
      throw new Error("Expected adaptive icon surface to be rendered")
    }

    const icon = surface.querySelector("svg")

    expect(surface.className).toContain("bg-foreground")
    expect(surface.style.width).toBe("32px")
    expect(surface.style.height).toBe("32px")
    expect(icon).toBeTruthy()
    expect(icon?.getAttribute("class")).toContain("text-background")
    expect(icon?.getAttribute("style")).toContain("width: 24px")
    expect(icon?.getAttribute("style")).toContain("height: 24px")
  })

  it("advances to the next image candidate after an error", () => {
    const { container } = render(
      <AdaptiveIcon
        imageSources={[
          "https://example.com/first.png",
          "https://example.com/second.png",
        ]}
        fallbackLabel="A"
      />
    )

    const firstImage = container.querySelector("img")
    expect(firstImage?.getAttribute("src")).toBe("https://example.com/first.png")

    if (!firstImage) {
      throw new Error("Expected first image to be rendered")
    }

    fireEvent.error(firstImage)

    const secondImage = container.querySelector("img")
    expect(secondImage?.getAttribute("src")).toBe("https://example.com/second.png")
  })
})
