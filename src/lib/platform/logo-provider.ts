import { LOGO_DEV_PUBLISHABLE_KEY } from "@/config/logo-provider"
import { getPlatformRegistryEntryById } from "@/lib/platform/utils"

type LogoDevImageFormat = "webp" | "png" | "jpg"
type LogoDevTheme = "auto" | "light" | "dark"
type LogoDevFallback = "monogram" | "404"

type PlatformLogoOptions = {
  size?: number
  format?: LogoDevImageFormat
  theme?: LogoDevTheme
  fallback?: LogoDevFallback
  retina?: boolean
}

const buildLogoDevUrl = (
  domain: string,
  {
    size = 64,
    format = "webp",
    theme = "auto",
    fallback = "monogram",
    retina = true,
  }: PlatformLogoOptions = {}
) => {
  const normalizedDomain = domain.trim()
  if (!normalizedDomain) {
    return undefined
  }

  const params = new URLSearchParams({
    token: LOGO_DEV_PUBLISHABLE_KEY,
    size: String(size),
    format,
    theme,
    fallback,
    retina: String(retina),
  })

  return `https://img.logo.dev/${normalizedDomain}?${params.toString()}`
}

export const getPlatformLogoUrlForDomain = (
  domain: string,
  options?: PlatformLogoOptions
) => buildLogoDevUrl(domain, options)

export const getPlatformLogoUrlForToken = (
  token: string,
  options?: PlatformLogoOptions
) => {
  const normalizedToken = token.trim().toLowerCase()
  if (!normalizedToken) {
    return undefined
  }

  const brandDomain =
    getPlatformRegistryEntryById(normalizedToken)?.brandDomain ??
    `${normalizedToken}.com`

  return getPlatformLogoUrlForDomain(brandDomain, options)
}
