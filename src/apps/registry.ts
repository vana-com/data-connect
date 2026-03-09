import type { AppRegistryEntry } from "./registry-types"
import { getSubmittedAppRegistryEntries } from "./submission-registry"

export type { AppRegistryEntry } from "./registry-types"

const APP_REGISTRY_LIST: AppRegistryEntry[] = getSubmittedAppRegistryEntries()

const APP_REGISTRY = createAppRegistry(APP_REGISTRY_LIST)

function createAppRegistry(
  entries: AppRegistryEntry[]
): Record<string, AppRegistryEntry> {
  const registryEntries = entries.map(entry => [entry.id, entry] as const)
  const uniqueIds = new Set(registryEntries.map(([id]) => id))

  if (uniqueIds.size !== registryEntries.length) {
    throw new Error(
      "Duplicate app registry ids found while building the app registry."
    )
  }

  return Object.fromEntries(registryEntries)
}

export function getAppRegistryEntry(
  appId?: string | null
): AppRegistryEntry | null {
  if (!appId) return null
  return APP_REGISTRY[appId] ?? null
}

export function getAppRegistryEntries(): AppRegistryEntry[] {
  return APP_REGISTRY_LIST
}
