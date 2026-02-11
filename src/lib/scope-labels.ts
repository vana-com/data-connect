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
    .map(scope => {
      // Handle "read:chatgpt-conversations" → "chatgpt"
      const afterColon = scope.split(":")[1]
      if (afterColon) return afterColon.split("-")[0]
      // Handle "chatgpt.conversations" → "chatgpt"
      return scope.split(".")[0]
    })
    .find(Boolean)
  if (!scopeToken) return null
  return scopeToken.toLowerCase()
}

export function getPrimaryDataSourceLabel(scopes?: string[]) {
  const scopeKey = getPrimaryScopeToken(scopes)
  if (!scopeKey) return null
  return (
    DATA_SOURCE_LABELS[scopeKey] ??
    `${scopeKey.charAt(0).toUpperCase()}${scopeKey.slice(1)}`
  )
}
