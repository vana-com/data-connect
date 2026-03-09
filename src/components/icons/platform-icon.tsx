import { type ComponentProps } from "react"
import { AdaptiveIcon } from "@/components/icons/adaptive-icon"
import type { AdaptiveIconVariant } from "@/components/icons/adaptive-icon"
import { getPlatformIconComponentForName } from "@/lib/platform/icons"
import { getPlatformLogoUrlForDomain } from "@/lib/platform/logo-provider"
import {
  getPlatformRegistryEntryById,
  getPlatformRegistryEntryByName,
} from "@/lib/platform/utils"

/**
 * Shared platform icon utilities for displaying connector icons.
 * Used by Home.tsx and ConnectorUpdates.tsx.
 */

interface PlatformIconProps extends Omit<ComponentProps<"div">, "children"> {
  iconName: string
  imageSrc?: string
  imageAlt?: string
  size?: number
  imageScale?: number
  fallbackLabel?: string
  fallbackScale?: number
  variant?: AdaptiveIconVariant
  ariaHidden?: boolean
}

/**
 * Platform icon component
 * Displays a platform logo or first-letter fallback
 */
export function PlatformIcon({
  iconName,
  imageSrc,
  imageAlt = "",
  size = 32,
  imageScale = 1,
  className,
  fallbackLabel,
  fallbackScale = 0.75,
  variant = "padded",
  ariaHidden,
  "aria-hidden": ariaHiddenProp,
  ...props
}: PlatformIconProps) {
  const Icon = getPlatformIconComponentForName(iconName)
  const registryEntry =
    getPlatformRegistryEntryById(iconName) ??
    getPlatformRegistryEntryByName(iconName)
  const resolvedImageSrc =
    imageSrc ??
    (registryEntry?.brandDomain
      ? getPlatformLogoUrlForDomain(registryEntry.brandDomain)
      : undefined)
  const resolvedAriaHidden = ariaHidden ?? ariaHiddenProp ?? true
  const label = (fallbackLabel?.trim() || iconName.trim().charAt(0)).toUpperCase()

  return (
    <AdaptiveIcon
      variant={variant}
      className={className}
      imageSources={resolvedImageSrc ? [resolvedImageSrc] : undefined}
      imageAlt={imageAlt}
      size={size}
      imageScale={imageScale}
      icon={Icon ?? undefined}
      fallbackLabel={label}
      fallbackScale={fallbackScale}
      aria-hidden={resolvedAriaHidden}
      {...props}
    />
  )
}
