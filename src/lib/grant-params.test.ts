import { describe, expect, it } from "vitest"
import {
  buildGrantSearchParams,
  extractGrantParamsFromSearchParams,
  getGrantParamsFromSearchParams,
  parseScopesParam,
  parseScopesParamWithSource,
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

  it("tracks scope parse source across canonical and compat forms", () => {
    expect(parseScopesParamWithSource('["read:a","read:b"]')).toEqual({
      scopes: ["read:a", "read:b"],
      source: "canonical-json-array",
    })
    expect(parseScopesParamWithSource('"read:a,read:b"')).toEqual({
      scopes: ["read:a", "read:b"],
      source: "compat-json-string",
    })
    expect(parseScopesParamWithSource("read:a,read:b")).toEqual({
      scopes: ["read:a", "read:b"],
      source: "compat-csv",
    })
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

  it("serializes params in deterministic canonical key order", () => {
    const searchParams = buildGrantSearchParams({
      sessionId: "sess-42",
      secret: "sec-42",
      appId: "app-42",
      scopes: ["read:a"],
      status: "success",
    })

    expect(searchParams.toString()).toBe(
      "sessionId=sess-42&secret=sec-42&appId=app-42&scopes=%5B%22read%3Aa%22%5D&status=success"
    )
  })

  it("extracts params with parse source metadata", () => {
    const parsed = extractGrantParamsFromSearchParams(
      new URLSearchParams("sessionId=sess-1&scopes=read%3Aa%2Cread%3Ab")
    )

    expect(parsed.params).toEqual({
      sessionId: "sess-1",
      secret: undefined,
      appId: undefined,
      scopes: ["read:a", "read:b"],
      status: undefined,
    })
    expect(parsed.scopeParseSource).toBe("compat-csv")
  })
})
