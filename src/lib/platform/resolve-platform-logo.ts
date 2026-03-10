import type { Platform } from "@/types"
import type { PlatformRegistryEntry } from "./registry"
import { getPlatformLogoUrlForDomain } from "./logo-provider"

const isDataUrl = (value: string) => value.startsWith("data:")

const isHttpUrl = (value: string) =>
  value.startsWith("https://") || value.startsWith("http://")

const isAllowedLogoUrl = (value: string) => isDataUrl(value) || isHttpUrl(value)

export const resolvePlatformLogo = (
  platform: Platform,
  entry: PlatformRegistryEntry | null
) => {
  const platformLogoUrl = platform.logoURL?.trim()
  if (platformLogoUrl && isAllowedLogoUrl(platformLogoUrl)) {
    return platformLogoUrl
  }

  if (entry?.brandDomain) {
    return getPlatformLogoUrlForDomain(entry.brandDomain, {
      theme: "dark",
    })
  }

  return undefined
}
