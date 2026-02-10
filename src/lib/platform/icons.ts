import type { ElementType } from "react"
import { IconX } from "@/components/icons/icon-x"
import { PlatformChatGPTIcon } from "@/components/icons/platform-chatgpt"
import { PlatformInstagramGlyphIcon } from "@/components/icons/platform-instagram-glyph"
import { PlatformLinkedinIcon } from "@/components/icons/platform-linkedin"
import { PlatformSpotifyIcon } from "@/components/icons/platform-spotify"
import type { PlatformRegistryEntry } from "./registry"
import {
  getPlatformRegistryEntry,
  getPlatformRegistryEntryById,
  getPlatformRegistryEntryByName,
} from "./utils"

export type PlatformIconComponent = ElementType<{ className?: string }>

const PLATFORM_ICON_COMPONENTS: Record<string, PlatformIconComponent> = {
  chatgpt: PlatformChatGPTIcon,
  instagram: PlatformInstagramGlyphIcon,
  linkedin: PlatformLinkedinIcon,
  spotify: PlatformSpotifyIcon,
  x: IconX,
}

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
