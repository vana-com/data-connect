import { describe, expect, it } from "vitest"
import {
  isAllowedSubmittedAppExternalUrl,
  parseSubmittedAppExternalUrl,
} from "./external-url"

describe("submitted app external urls", () => {
  it("accepts https urls", () => {
    expect(isAllowedSubmittedAppExternalUrl("https://example.com")).toBe(true)
  })

  it("rejects http urls", () => {
    expect(isAllowedSubmittedAppExternalUrl("http://localhost:3000")).toBe(false)
    expect(isAllowedSubmittedAppExternalUrl("http://example.com")).toBe(false)
  })

  it("rejects custom uri schemes", () => {
    expect(isAllowedSubmittedAppExternalUrl("mailto:test@example.com")).toBe(false)
    expect(isAllowedSubmittedAppExternalUrl("vscode://file/test")).toBe(false)
    expect(isAllowedSubmittedAppExternalUrl("file:///tmp/test")).toBe(false)
  })

  it("throws when parsing a disallowed url", () => {
    expect(() => parseSubmittedAppExternalUrl("http://example.com")).toThrow(
      /https:\/\//i
    )
  })
})
