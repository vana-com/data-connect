type PlatformLogoProvider = "logoDev" | "brandDev"

const BRAND_DEV_PUBLIC_CLIENT_ID =
  import.meta.env.VITE_BRAND_DEV_PUBLIC_CLIENT_ID?.trim() ?? ""

const resolveProvider = (): PlatformLogoProvider => {
  const configured = import.meta.env.VITE_PLATFORM_LOGO_PROVIDER
  if (configured === "logoDev") return "logoDev"
  if (configured === "brandDev") return "brandDev"
  return "brandDev"
}

const provider = resolveProvider()

const buildLogoDevUrl = (domain: string, size: number) =>
  `https://img.logo.dev/${domain}?size=${size}&format=webp&retina=true&fallback=monogram`

const buildBrandDevUrl = (domain: string) =>
  `https://logos.brand.dev/?publicClientId=${encodeURIComponent(BRAND_DEV_PUBLIC_CLIENT_ID)}&domain=${encodeURIComponent(domain)}`

export const getPlatformLogoUrlForDomain = (
  domain: string,
  options?: { size?: number }
) => {
  const size = options?.size ?? 64
  if (provider === "brandDev" && BRAND_DEV_PUBLIC_CLIENT_ID) {
    return buildBrandDevUrl(domain)
  }

  // If Brand.dev is selected but no public client id is configured,
  // keep logos working by falling back to logo.dev.
  return buildLogoDevUrl(domain, size)
}
