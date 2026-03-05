import type { ElementType } from "react"
import type { PlatformRegistryEntry } from "./registry"
import {
  getPlatformRegistryEntry,
  getPlatformRegistryEntryById,
  getPlatformRegistryEntryByName,
} from "./utils"

export type PlatformIconComponent = ElementType<{ className?: string }>

const PLATFORM_ICON_COMPONENTS: Record<string, PlatformIconComponent> = {}

const resolveIconComponentForEntry = (entry: PlatformRegistryEntry | null) => {
  if (!entry) return null
  const key = entry.iconKey ?? entry.id
  return PLATFORM_ICON_COMPONENTS[key] ?? null
}

export const getPlatformIconComponentForPlatform = (platform: {
  id: string
  name: string
  company?: string
}) => resolveIconComponentForEntry(getPlatformRegistryEntry(platform))

export const getPlatformIconComponentForName = (nameOrId: string) => {
  const entry =
    getPlatformRegistryEntryById(nameOrId) ??
    getPlatformRegistryEntryByName(nameOrId)
  return resolveIconComponentForEntry(entry)
}

export const getPlatformIconComponentForEntry = (
  entry: PlatformRegistryEntry
) => resolveIconComponentForEntry(entry)

export const getPlatformIconComponentForKey = (iconKey: string) =>
  PLATFORM_ICON_COMPONENTS[iconKey] ?? null
