const DATA_SOURCE_LABELS: Record<string, string> = {
  chatgpt: "ChatGPT",
  reddit: "Reddit",
  twitter: "Twitter",
  x: "X (Twitter)",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  spotify: "Spotify",
  tiktok: "TikTok",
  youtube: "YouTube",
  facebook: "Facebook",
  google: "Google",
}

export function getPrimaryScopeToken(scopes?: string[]) {
  if (!scopes || scopes.length === 0) return null
  const scopeToken = scopes
    .map(scope => scope.split(":")[1] ?? scope)
    .find(Boolean)
  if (!scopeToken) return null
  return scopeToken.split("-")[0]?.toLowerCase() ?? null
}

export function getPrimaryDataSourceLabel(scopes?: string[]) {
  const scopeKey = getPrimaryScopeToken(scopes)
  if (!scopeKey) return null
  return (
    DATA_SOURCE_LABELS[scopeKey] ??
    `${scopeKey.charAt(0).toUpperCase()}${scopeKey.slice(1)}`
  )
}
