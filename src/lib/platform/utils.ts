import type { Platform } from "@/types"
import { PLATFORM_REGISTRY, type PlatformRegistryEntry } from "./registry"

const normalizeToken = (value: string) => value.trim().toLowerCase()

const entryMatchesToken = (entry: PlatformRegistryEntry, token: string) => {
  if (normalizeToken(entry.id) === token) return true
  if (normalizeToken(entry.displayName) === token) return true
  if (entry.platformIds?.some(id => normalizeToken(id) === token)) return true
  if (entry.aliases?.some(alias => normalizeToken(alias) === token)) return true
  return false
}

const findRegistryEntryByToken = (token: string) =>
  PLATFORM_REGISTRY.find(entry => entryMatchesToken(entry, token)) ?? null

export const getPlatformRegistryEntryById = (platformId: string) =>
  findRegistryEntryByToken(normalizeToken(platformId))

export const getPlatformRegistryEntryByName = (name: string) =>
  findRegistryEntryByToken(normalizeToken(name))

export const getPlatformRegistryEntry = (platform: {
  id?: string
  name?: string
  company?: string
}) => {
  if (platform.id) {
    const byId = getPlatformRegistryEntryById(platform.id)
    if (byId) return byId
  }
  if (platform.name) {
    const byName = getPlatformRegistryEntryByName(platform.name)
    if (byName) return byName
  }
  if (platform.company) {
    const byCompany = getPlatformRegistryEntryByName(platform.company)
    if (byCompany) return byCompany
  }
  return null
}

export const getPlatformIngestScope = (platformId: string) =>
  getPlatformRegistryEntryById(platformId)?.ingestScope ?? null

export const getConnectSourceEntries = () =>
  PLATFORM_REGISTRY.filter(entry => entry.showInConnectList)

export const resolvePlatformForEntry = (
  platforms: Platform[],
  entry: PlatformRegistryEntry
) => {
  const entryPlatformIds = entry.platformIds?.map(normalizeToken) ?? []
  const entryTokens = [entry.id, ...(entry.aliases ?? [])].map(normalizeToken)
  return (
    platforms.find(platform =>
      entryPlatformIds.includes(normalizeToken(platform.id))
    ) ??
    platforms.find(platform =>
      entryTokens.some(token =>
        [platform.id, platform.name, platform.company]
          .filter(Boolean)
          .map(value => normalizeToken(value))
          .includes(token)
      )
    ) ??
    null
  )
}

export const getConnectSourceState = (
  entry: PlatformRegistryEntry,
  platform: Platform | null
) => {
  if (entry.availability === "available") return "available"
  if (entry.availability === "comingSoon") return "comingSoon"
  return platform ? "available" : "comingSoon"
}
