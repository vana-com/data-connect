const DEFAULT_ICON_PATHS = [
  "/icon.svg",
  "/icon.png",
  "/favicon.ico",
  "/apple-touch-icon.png",
] as const

export function deriveIconUrls(appUrl: string | null, iconUrl?: string): string[] {
  const candidates = new Set<string>()

  if (iconUrl?.trim()) {
    candidates.add(iconUrl.trim())
  }

  if (!appUrl) {
    return Array.from(candidates)
  }

  try {
    for (const path of DEFAULT_ICON_PATHS) {
      candidates.add(new URL(path, appUrl).toString())
    }
  } catch {
    return Array.from(candidates)
  }

  return Array.from(candidates)
}
