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

// Default 2px padding to ensure the icon is centered within the wrapper
const iconWrapper = "flex items-center justify-center rounded-card p-1"

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

  if (Icon) {
    return (
      <div className={cn(iconWrapper, className)}>
        <Icon style={{ width: `${size}px`, height: `${size}px` }} aria-hidden />
      </div>
    )
  }

  // Fallback: show first letter
  const fontSize = Math.round(size * 0.75)
  return (
    <div className={cn(iconWrapper, className)}>
      <span
        className={cn("text-background bg-foreground font-semi")}
        style={{ fontSize: `${fontSize}px` }}
      >
        {iconName.charAt(0)}
      </span>
    </div>
  )
}
