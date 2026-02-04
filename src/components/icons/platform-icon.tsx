import { getPlatformIconComponentForName } from "@/lib/platform/icons"
import { cn } from "@/lib/utils"

/**
 * Shared platform icon utilities for displaying connector icons.
 * Used by Home.tsx and ConnectorUpdates.tsx.
 */

interface PlatformIconProps {
  iconName: string
  size?: number
  className?: string
}

const iconWrapper = "flex items-center justify-center rounded-card"

/**
 * Platform icon component
 * Displays a platform logo or first-letter fallback
 */
export function PlatformIcon({
  iconName,
  size = 24,
  className,
}: PlatformIconProps) {
  const Icon = getPlatformIconComponentForName(iconName)
  const wrapperSize = Math.round(size * 1.15)

  if (Icon) {
    return (
      <div
        className={cn(iconWrapper, className)}
        style={{ width: `${wrapperSize}px`, height: `${wrapperSize}px` }}
      >
        <Icon style={{ width: `${size}px`, height: `${size}px` }} aria-hidden />
      </div>
    )
  }

  // Fallback: show first letter
  const fontSize = Math.round(size * 0.75)
  return (
    <div
      className={cn(iconWrapper, className)}
      style={{ width: `${wrapperSize}px`, height: `${wrapperSize}px` }}
    >
      <span
        className={cn("text-background bg-foreground font-semi")}
        style={{ fontSize: `${fontSize}px` }}
      >
        {iconName.charAt(0)}
      </span>
    </div>
  )
}
