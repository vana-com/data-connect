import { useEffect, useState, type ComponentProps } from "react"
import { getPlatformIconComponentForName } from "@/lib/platform/icons"
import { getPlatformLogoUrlForDomain } from "@/lib/platform/logo-provider"
import {
  getPlatformRegistryEntryById,
  getPlatformRegistryEntryByName,
} from "@/lib/platform/utils"
import { cn } from "@/lib/utils"

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
  ariaHidden?: boolean
}

// Default 2px padding to ensure the icon is centered within the wrapper
const iconWrapper =
  "flex items-center justify-center rounded-button overflow-hidden p-1"

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
  const [imageFailed, setImageFailed] = useState(false)
  const scaledImageSize = Math.round(size * imageScale)
  // 12% of the image size is the border radius
  const imageBorderRadiusPx = Math.max(3, Math.round(scaledImageSize * 0.12))

  useEffect(() => {
    setImageFailed(false)
  }, [resolvedImageSrc])

  if (resolvedImageSrc && !imageFailed) {
    return (
      <div
        className={cn(iconWrapper, className)}
        aria-hidden={resolvedAriaHidden}
        {...props}
      >
        <img
          src={resolvedImageSrc}
          alt={imageAlt}
          className="object-contain"
          onError={() => setImageFailed(true)}
          style={{
            width: `${scaledImageSize}px`,
            height: `${scaledImageSize}px`,
            borderRadius: `${imageBorderRadiusPx}px`,
          }}
        />
      </div>
    )
  }

  if (Icon) {
    return (
      <div
        className={cn(iconWrapper, className)}
        aria-hidden={resolvedAriaHidden}
        {...props}
      >
        <Icon style={{ width: `${size}px`, height: `${size}px` }} aria-hidden />
      </div>
    )
  }

  // Fallback: show first letter. Background only on inner span so it doesn't bleed into padding.
  const label = (fallbackLabel?.trim() || iconName.trim().charAt(0)).toUpperCase()
  const fontSize = Math.round(size * fallbackScale)
  const innerBorderRadiusPx = Math.max(3, Math.round(size * 0.12))
  return (
    <div
      className={cn(iconWrapper, className)}
      aria-hidden={resolvedAriaHidden}
      {...props}
    >
      <span
        className={cn(
          "flex items-center justify-center",
          "text-background bg-foreground font-semi"
        )}
        style={{
          fontSize: `${fontSize}px`,
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: `${innerBorderRadiusPx}px`,
        }}
      >
        {label}
      </span>
    </div>
  )
}
