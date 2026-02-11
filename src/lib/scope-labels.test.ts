import { describe, expect, it } from "vitest"
import { formatScopeLabel, getPrimaryScopeToken, getPrimaryDataSourceLabel } from "./scope-labels"

describe("getPrimaryScopeToken", () => {
  it("returns null for undefined scopes", () => {
    expect(getPrimaryScopeToken(undefined)).toBe(null)
  })

  it("returns null for empty scopes", () => {
    expect(getPrimaryScopeToken([])).toBe(null)
  })

  // Protocol format: "platform.dataType"
  it('extracts "chatgpt" from dot-separated scope "chatgpt.conversations"', () => {
    expect(getPrimaryScopeToken(["chatgpt.conversations"])).toBe("chatgpt")
  })

  it('extracts "spotify" from dot-separated scope "spotify.history"', () => {
    expect(getPrimaryScopeToken(["spotify.history"])).toBe("spotify")
  })

  it('extracts "instagram" from dot-separated scope "instagram.posts"', () => {
    expect(getPrimaryScopeToken(["instagram.posts"])).toBe("instagram")
  })

  // Legacy format: "action:platform-dataType"
  it('extracts "chatgpt" from colon-hyphen scope "read:chatgpt-conversations"', () => {
    expect(getPrimaryScopeToken(["read:chatgpt-conversations"])).toBe("chatgpt")
  })

  it("uses the first scope when multiple are provided", () => {
    expect(
      getPrimaryScopeToken(["chatgpt.conversations", "spotify.history"])
    ).toBe("chatgpt")
  })

  it("returns a bare token as-is", () => {
    expect(getPrimaryScopeToken(["chatgpt"])).toBe("chatgpt")
  })

  it("lowercases the token", () => {
    expect(getPrimaryScopeToken(["ChatGPT.conversations"])).toBe("chatgpt")
  })
})

describe("getPrimaryDataSourceLabel", () => {
  it("returns null for undefined scopes", () => {
    expect(getPrimaryDataSourceLabel(undefined)).toBe(null)
  })

  it("returns null for empty scopes", () => {
    expect(getPrimaryDataSourceLabel([])).toBe(null)
  })

  it('returns "ChatGPT" for chatgpt.conversations', () => {
    expect(getPrimaryDataSourceLabel(["chatgpt.conversations"])).toBe("ChatGPT")
  })

  it('returns "ChatGPT" for read:chatgpt-conversations', () => {
    expect(getPrimaryDataSourceLabel(["read:chatgpt-conversations"])).toBe("ChatGPT")
  })

  it('returns "Spotify" for spotify.history', () => {
    expect(getPrimaryDataSourceLabel(["spotify.history"])).toBe("Spotify")
  })

  it("title-cases unknown platforms", () => {
    expect(getPrimaryDataSourceLabel(["notion.pages"])).toBe("Notion")
  })
})

describe("formatScopeLabel", () => {
  // Protocol format
  it('formats "chatgpt.conversations" with proper casing', () => {
    expect(formatScopeLabel("chatgpt.conversations")).toBe("ChatGPT Conversations")
  })

  it('formats "spotify.history" with proper casing', () => {
    expect(formatScopeLabel("spotify.history")).toBe("Spotify History")
  })

  it('formats "instagram.posts" with proper casing', () => {
    expect(formatScopeLabel("instagram.posts")).toBe("Instagram Posts")
  })

  it("title-cases unknown platforms", () => {
    expect(formatScopeLabel("notion.pages")).toBe("Notion Pages")
  })

  // Legacy format
  it('formats "read:chatgpt-conversations" with proper casing', () => {
    expect(formatScopeLabel("read:chatgpt-conversations")).toBe("ChatGPT Conversations")
  })

  it('formats "read:spotify-history" with proper casing', () => {
    expect(formatScopeLabel("read:spotify-history")).toBe("Spotify History")
  })

  // Bare platform token
  it("returns platform label for a bare token", () => {
    expect(formatScopeLabel("chatgpt")).toBe("ChatGPT")
  })

  // Multi-word data types
  it("handles hyphenated data types", () => {
    expect(formatScopeLabel("chatgpt.saved-conversations")).toBe("ChatGPT Saved Conversations")
  })
})
