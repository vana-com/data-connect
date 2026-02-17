export type GrantParams = {
  sessionId?: string
  secret?: string
  appId?: string
  scopes?: string[]
  status?: GrantStatusParam
  contractGatedParams?: Record<string, string>
}

export type GrantStatusParam = "success"

/**
 * Contract-gated params are preserved in URLs but not used for final grant
 * decisions yet. This keeps launch context intact while upstream contract
 * semantics are still being finalized across repos.
 */
export const CONTRACT_GATED_PARAM_KEYS = [
  "deepLinkUrl",
  "deep_link_url",
  "app",
  "appName",
] as const

function isValidScopes(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === "string")
}

export function parseScopesParam(
  scopesParam: string | null
): string[] | undefined {
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
  const secret = searchParams.get("secret") || undefined
  const appId = searchParams.get("appId") || undefined
  const scopes = parseScopesParam(searchParams.get("scopes"))
  const status =
    searchParams.get("status") === "success" ? ("success" as const) : undefined
  const contractGatedParams: Record<string, string> = {}
  for (const key of CONTRACT_GATED_PARAM_KEYS) {
    const value = searchParams.get(key)
    if (value) {
      contractGatedParams[key] = value
    }
  }

  return {
    sessionId,
    secret,
    appId,
    scopes,
    status,
    contractGatedParams:
      Object.keys(contractGatedParams).length > 0 ? contractGatedParams : undefined,
  }
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

  // TODO(contract-gated): remove passthrough once upstream launch contract is frozen.
  if (params.contractGatedParams) {
    for (const key of CONTRACT_GATED_PARAM_KEYS) {
      const value = params.contractGatedParams[key]
      if (value) {
        searchParams.set(key, value)
      }
    }
  }

  return searchParams
}
