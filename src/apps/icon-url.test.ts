import { describe, expect, it } from "vitest"
import { deriveIconUrls } from "./icon-url"

describe("deriveIconUrls", () => {
  it("derives stable icon paths from the app url", () => {
    expect(deriveIconUrls("https://example.com/app")).toEqual([
      "https://example.com/icon.svg",
      "https://example.com/icon.png",
      "https://example.com/favicon.ico",
      "https://example.com/apple-touch-icon.png",
    ])
  })

  it("prepends an explicit iconUrl override", () => {
    expect(
      deriveIconUrls("https://example.com/app", "https://cdn.example.com/icon.png")
    ).toEqual([
      "https://cdn.example.com/icon.png",
      "https://example.com/icon.svg",
      "https://example.com/icon.png",
      "https://example.com/favicon.ico",
      "https://example.com/apple-touch-icon.png",
    ])
  })

  it("returns only the explicit icon url when appUrl is invalid", () => {
    expect(deriveIconUrls("not a url", "https://cdn.example.com/icon.png")).toEqual([
      "https://cdn.example.com/icon.png",
    ])
  })
})
