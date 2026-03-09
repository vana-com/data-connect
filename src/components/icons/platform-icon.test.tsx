import { cleanup, fireEvent, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { PlatformIcon } from "./platform-icon"

let imageComplete = false
let imageNaturalWidth = 0

describe("PlatformIcon", () => {
  beforeEach(() => {
    imageComplete = false
    imageNaturalWidth = 0

    Object.defineProperty(HTMLImageElement.prototype, "complete", {
      configurable: true,
      get: () => imageComplete,
    })

    Object.defineProperty(HTMLImageElement.prototype, "naturalWidth", {
      configurable: true,
      get: () => imageNaturalWidth,
    })
  })

  afterEach(() => {
    cleanup()
  })

  it("keeps the muted background until the image loads", () => {
    const { container } = render(
      <PlatformIcon
        iconName="chatgpt"
        imageSrc="https://example.com/chatgpt.png"
        imageAlt="ChatGPT"
      />
    )

    const image = container.querySelector("img")

    expect(image).toBeTruthy()
    if (!image) {
      throw new Error("Expected image to be rendered")
    }

    const imageFrame = image.parentElement

    expect(imageFrame).toBeTruthy()
    expect(imageFrame?.className).toContain("bg-muted")

    fireEvent.load(image!)

    expect(imageFrame?.className).not.toContain("bg-muted")
  })

  it("removes the muted background immediately for cached images", () => {
    const { rerender } = render(
      <PlatformIcon
        iconName="chatgpt"
        imageSrc="https://example.com/chatgpt.png"
        imageAlt="ChatGPT"
      />
    )

    imageComplete = true
    imageNaturalWidth = 64

    rerender(
      <PlatformIcon
        iconName="chatgpt"
        imageSrc="https://example.com/chatgpt-cached.png"
        imageAlt="ChatGPT"
      />
    )

    const image = document.querySelector("img")

    expect(image).toBeTruthy()
    if (!image) {
      throw new Error("Expected image to be rendered")
    }

    const imageFrame = image.parentElement

    expect(imageFrame).toBeTruthy()
    expect(imageFrame?.className).not.toContain("bg-muted")
  })

  it("restores the muted background immediately when the src changes", () => {
    const { container, rerender } = render(
      <PlatformIcon
        iconName="chatgpt"
        imageSrc="https://example.com/chatgpt.png"
        imageAlt="ChatGPT"
      />
    )

    const firstImage = container.querySelector("img")
    expect(firstImage).toBeTruthy()

    fireEvent.load(firstImage!)

    const firstImageFrame = firstImage?.parentElement
    expect(firstImageFrame?.className).not.toContain("bg-muted")

    rerender(
      <PlatformIcon
        iconName="chatgpt"
        imageSrc="https://example.com/chatgpt-next.png"
        imageAlt="ChatGPT"
      />
    )

    const nextImage = container.querySelector("img")
    const nextImageFrame = nextImage?.parentElement

    expect(nextImage).toBeTruthy()
    expect(nextImageFrame?.className).toContain("bg-muted")
  })
})
