export type GrantParams = {
  sessionId?: string
  secret?: string
  appId?: string
  scopes?: string[]
  status?: GrantStatusParam
}

export type GrantStatusParam = "success"

export type ScopeParseSource =
  | "missing"
  | "canonical-json-array"
  | "compat-json-string"
  | "compat-csv"
  | "invalid"

function isValidScopes(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === "string")
}

export function parseScopesParamWithSource(scopesParam: string | null): {
  scopes: string[] | undefined
  source: ScopeParseSource
} {
  if (!scopesParam) {
    return { scopes: undefined, source: "missing" }
  }

  try {
    const parsed = JSON.parse(scopesParam)
    if (isValidScopes(parsed)) {
      return { scopes: parsed, source: "canonical-json-array" }
    }
    if (typeof parsed === "string") {
      const commaSplit = parsed
        .split(",")
        .map(scope => scope.trim())
        .filter(Boolean)
      if (commaSplit.length > 0) {
        return { scopes: commaSplit, source: "compat-json-string" }
      }
    }
  } catch {
    const commaSplit = scopesParam
      .split(",")
      .map(scope => scope.trim())
      .filter(Boolean)
    if (commaSplit.length > 0) {
      return { scopes: commaSplit, source: "compat-csv" }
    }
  }

  return { scopes: undefined, source: "invalid" }
}

export function parseScopesParam(
  scopesParam: string | null
): string[] | undefined {
  return parseScopesParamWithSource(scopesParam).scopes
}

export function extractGrantParamsFromSearchParams(searchParams: URLSearchParams): {
  params: GrantParams
  scopeParseSource: ScopeParseSource
} {
  const sessionId = searchParams.get("sessionId") || undefined
  const secret = searchParams.get("secret") || undefined
  const appId = searchParams.get("appId") || undefined
  const { scopes, source } = parseScopesParamWithSource(searchParams.get("scopes"))
  const status =
    searchParams.get("status") === "success" ? ("success" as const) : undefined

  return {
    params: {
      sessionId,
      secret,
      appId,
      scopes,
      status,
    },
    scopeParseSource: source,
  }
}

export function getGrantParamsFromSearchParams(
  searchParams: URLSearchParams
): GrantParams {
  return extractGrantParamsFromSearchParams(searchParams).params
}

export function buildGrantSearchParams(params: GrantParams): URLSearchParams {
  const searchParams = new URLSearchParams()

  if (params.sessionId) {
    searchParams.set("sessionId", params.sessionId)
  }

  if (params.secret) {
    searchParams.set("secret", params.secret)
  }

  if (params.appId) {
    searchParams.set("appId", params.appId)
  }

  if (params.scopes && params.scopes.length > 0) {
    searchParams.set("scopes", JSON.stringify(params.scopes))
  }

  if (params.status) {
    searchParams.set("status", params.status)
  }

  return searchParams
}
