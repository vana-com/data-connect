import {
  buildGrantSearchParams,
  extractGrantParamsFromSearchParams,
  type GrantParams,
  type ScopeParseSource,
} from "./grant-params"

const CANONICAL_GRANT_PARAM_KEYS = new Set([
  "sessionId",
  "secret",
  "appId",
  "scopes",
  "status",
])

type StrictRejectReason = "unknown-params" | "non-canonical-scopes"

export type NormalizedGrantParams = {
  params: GrantParams
  hasGrantParams: boolean
  normalizedSearch: string
  scopeParseSource: ScopeParseSource
  unknownParams: string[]
  strictRejected: boolean
  strictRejectReason?: StrictRejectReason
}

export type NormalizeGrantParamsOptions = {
  strictAllowlist: boolean
}

export function normalizeGrantParams(
  searchParams: URLSearchParams,
  options?: NormalizeGrantParamsOptions
): NormalizedGrantParams {
  const { params, scopeParseSource } = extractGrantParamsFromSearchParams(searchParams)
  const unknownParams = [...new Set([...searchParams.keys()])].filter(
    key => !CANONICAL_GRANT_PARAM_KEYS.has(key)
  )
  const strictAllowlistEnabled = options?.strictAllowlist ?? false
  const hasNonCanonicalScopes =
    scopeParseSource !== "missing" && scopeParseSource !== "canonical-json-array"
  const strictRejectReason =
    unknownParams.length > 0
      ? ("unknown-params" as const)
      : hasNonCanonicalScopes
        ? ("non-canonical-scopes" as const)
        : undefined
  const strictRejected = strictAllowlistEnabled && strictRejectReason !== undefined
  const normalizedSearch = buildGrantSearchParams(params).toString()

  return {
    params,
    hasGrantParams: !strictRejected && Boolean(params.sessionId || params.appId),
    normalizedSearch,
    scopeParseSource,
    unknownParams,
    strictRejected,
    strictRejectReason,
  }
}
