import { describe, expect, it } from "vitest"
import {
  buildGrantSearchParams,
  getGrantParamsFromSearchParams,
  parseScopesParam,
} from "./grant-params"

describe("grant-params", () => {
  it("parses scopes from JSON array", () => {
    expect(parseScopesParam('["read:a","read:b"]')).toEqual([
      "read:a",
      "read:b",
    ])
  })

  it("parses scopes from JSON string and comma-delimited fallback", () => {
    expect(parseScopesParam('"read:a,read:b"')).toEqual(["read:a", "read:b"])
    expect(parseScopesParam("read:a,read:b")).toEqual(["read:a", "read:b"])
  })

  it("returns undefined for invalid scopes", () => {
    expect(parseScopesParam("")).toBeUndefined()
    expect(parseScopesParam("[1]")).toBeUndefined()
  })

  it("builds and reads grant search params", () => {
    const searchParams = buildGrantSearchParams({
      sessionId: "grant-session-1",
      appId: "rickroll",
      scopes: ["read:a", "read:b"],
      status: "success",
    })

    expect(searchParams.get("sessionId")).toBe("grant-session-1")
    expect(searchParams.get("appId")).toBe("rickroll")
    expect(searchParams.get("scopes")).toBe('["read:a","read:b"]')
    expect(searchParams.get("status")).toBe("success")

    const roundTrip = getGrantParamsFromSearchParams(searchParams)
    expect(roundTrip).toEqual({
      sessionId: "grant-session-1",
      appId: "rickroll",
      scopes: ["read:a", "read:b"],
      status: "success",
    })
  })

  it("parses and round-trips secret param", () => {
    const searchParams = buildGrantSearchParams({
      sessionId: "sess-1",
      secret: "my-secret-token",
    })

    expect(searchParams.get("secret")).toBe("my-secret-token")

    const roundTrip = getGrantParamsFromSearchParams(searchParams)
    expect(roundTrip.secret).toBe("my-secret-token")
  })

  it("omits secret from search params when not provided", () => {
    const searchParams = buildGrantSearchParams({
      sessionId: "sess-1",
    })

    expect(searchParams.has("secret")).toBe(false)

    const roundTrip = getGrantParamsFromSearchParams(searchParams)
    expect(roundTrip.secret).toBeUndefined()
  })

  it("round-trips contract-gated params without using them for decisions", () => {
    const searchParams = buildGrantSearchParams({
      sessionId: "sess-1",
      secret: "secret-1",
      contractGatedParams: {
        deepLinkUrl: "vana://connect?sessionId=sess-1",
        appName: "Test Builder",
      },
    })

    expect(searchParams.get("deepLinkUrl")).toBe("vana://connect?sessionId=sess-1")
    expect(searchParams.get("appName")).toBe("Test Builder")

    const roundTrip = getGrantParamsFromSearchParams(searchParams)
    expect(roundTrip.contractGatedParams).toEqual({
      deepLinkUrl: "vana://connect?sessionId=sess-1",
      appName: "Test Builder",
    })
    expect(roundTrip.sessionId).toBe("sess-1")
    expect(roundTrip.secret).toBe("secret-1")
  })
})
