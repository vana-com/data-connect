import {
  buildGrantSearchParams,
  extractGrantParamsFromSearchParams,
  type GrantParams,
  type ScopeParseSource,
} from "./grant-params"

export type NormalizedGrantParams = {
  params: GrantParams
  hasGrantParams: boolean
  normalizedSearch: string
  scopeParseSource: ScopeParseSource
}

export function normalizeGrantParams(
  searchParams: URLSearchParams
): NormalizedGrantParams {
  const { params, scopeParseSource } = extractGrantParamsFromSearchParams(searchParams)
  const normalizedSearch = buildGrantSearchParams(params).toString()

  return {
    params,
    hasGrantParams: Boolean(params.sessionId || params.appId),
    normalizedSearch,
    scopeParseSource,
  }
}
