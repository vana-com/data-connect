export type AppRegistryEntry = {
  id: string
  name: string
  icon: string
  scopes: string[]
}

const APP_REGISTRY: Record<string, AppRegistryEntry> = {
  rickroll: {
    id: "rickroll",
    name: "RickRoll Facts",
    icon: "🎵",
    scopes: ["read:chatgpt-conversations"],
  },
}

export const DEFAULT_APP_ID = "rickroll"

export function getAppRegistryEntry(appId?: string | null): AppRegistryEntry | null {
  if (!appId) return null
  return APP_REGISTRY[appId] ?? null
}

export function getDefaultAppEntry(): AppRegistryEntry {
  return APP_REGISTRY[DEFAULT_APP_ID]
}

export function getAppRegistryEntries(): AppRegistryEntry[] {
  return Object.values(APP_REGISTRY)
}
