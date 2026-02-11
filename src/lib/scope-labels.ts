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

/**
 * Format a scope string into a human-readable label.
 * Uses the platform registry for proper casing (e.g., "ChatGPT" not "Chatgpt").
 *
 * Examples:
 *   "chatgpt.conversations" → "ChatGPT Conversations"
 *   "read:chatgpt-conversations" → "ChatGPT Conversations"
 *   "spotify.history" → "Spotify History"
 */
export function formatScopeLabel(scope: string): string {
  let platform: string
  let dataType: string

  // Legacy format: "read:chatgpt-conversations"
  const afterColon = scope.split(":")[1]
  if (afterColon) {
    const parts = afterColon.split("-")
    platform = parts[0]
    dataType = parts.slice(1).join(" ")
  } else {
    // Protocol format: "chatgpt.conversations"
    const parts = scope.split(".")
    platform = parts[0]
    dataType = parts.slice(1).join(" ")
  }

  const platformLabel =
    DATA_SOURCE_LABELS[platform.toLowerCase()] ??
    `${platform.charAt(0).toUpperCase()}${platform.slice(1)}`

  if (!dataType) return platformLabel

  const dataTypeLabel = dataType
    .split(/[\-_]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")

  return `${platformLabel} ${dataTypeLabel}`
}
