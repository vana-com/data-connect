export type GrantParams = {
  sessionId?: string
  appId?: string
  scopes?: string[]
}

function isValidScopes(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === "string")
}

export function parseScopesParam(scopesParam: string | null): string[] | undefined {
  if (!scopesParam) return undefined

  try {
    const parsed = JSON.parse(scopesParam)
    if (isValidScopes(parsed)) {
      return parsed
    }
    if (typeof parsed === "string") {
      const commaSplit = parsed
        .split(",")
        .map(scope => scope.trim())
        .filter(Boolean)
      if (commaSplit.length > 0) {
        return commaSplit
      }
    }
  } catch {
    const commaSplit = scopesParam
      .split(",")
      .map(scope => scope.trim())
      .filter(Boolean)
    if (commaSplit.length > 0) {
      return commaSplit
    }
  }

  return undefined
}

export function getGrantParamsFromSearchParams(
  searchParams: URLSearchParams
): GrantParams {
  const sessionId = searchParams.get("sessionId") || undefined
  const appId = searchParams.get("appId") || undefined
  const scopes = parseScopesParam(searchParams.get("scopes"))

  return {
    sessionId,
    appId,
    scopes,
  }
}

export function buildGrantSearchParams(params: GrantParams): URLSearchParams {
  const searchParams = new URLSearchParams()

  if (params.sessionId) {
    searchParams.set("sessionId", params.sessionId)
  }

  if (params.appId) {
    searchParams.set("appId", params.appId)
  }

  if (params.scopes && params.scopes.length > 0) {
    searchParams.set("scopes", JSON.stringify(params.scopes))
  }

  return searchParams
}
