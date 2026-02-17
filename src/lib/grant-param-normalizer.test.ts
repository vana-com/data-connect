import { describe, expect, it } from "vitest"
import { normalizeGrantParams } from "./grant-param-normalizer"

describe("grant-param-normalizer", () => {
  it("keeps compatibility parsing when strict allowlist is disabled", () => {
    const parsed = normalizeGrantParams(
      new URLSearchParams("sessionId=sess-1&appId=app-1&scopes=read%3Aa%2Cread%3Ab&unknown=1"),
      { strictAllowlist: false }
    )

    expect(parsed.hasGrantParams).toBe(true)
    expect(parsed.strictRejected).toBe(false)
    expect(parsed.unknownParams).toEqual(["unknown"])
    expect(parsed.scopeParseSource).toBe("compat-csv")
    expect(parsed.normalizedSearch).toBe(
      "sessionId=sess-1&appId=app-1&scopes=%5B%22read%3Aa%22%2C%22read%3Ab%22%5D"
    )
  })

  it("rejects unknown params when strict allowlist is enabled", () => {
    const parsed = normalizeGrantParams(
      new URLSearchParams(
        "sessionId=sess-1&appId=app-1&scopes=%5B%22read%3Aa%22%5D&unknown=1"
      ),
      { strictAllowlist: true }
    )

    expect(parsed.hasGrantParams).toBe(false)
    expect(parsed.strictRejected).toBe(true)
    expect(parsed.strictRejectReason).toBe("unknown-params")
  })

  it("rejects compatibility scopes when strict allowlist is enabled", () => {
    const parsed = normalizeGrantParams(
      new URLSearchParams("sessionId=sess-1&appId=app-1&scopes=read%3Aa%2Cread%3Ab"),
      { strictAllowlist: true }
    )

    expect(parsed.hasGrantParams).toBe(false)
    expect(parsed.strictRejected).toBe(true)
    expect(parsed.strictRejectReason).toBe("non-canonical-scopes")
  })
})
