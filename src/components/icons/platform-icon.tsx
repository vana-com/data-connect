import { getPlatformIconComponentForName } from "@/lib/platform/icons"
import { cn } from "@/lib/utils"

/**
 * Shared platform icon utilities for displaying connector icons.
 * Used by Home.tsx and ConnectorUpdates.tsx.
 */

interface PlatformIconProps {
  /** Platform name to display icon for */
  name: string
  /** Icon size in pixels (default: 24) */
  size?: number
  className?: string
}

/**
 * Platform icon component that displays a platform logo or first-letter fallback.
 */
export function PlatformIcon({
  name,
  size = 24,
  className,
}: PlatformIconProps) {
  const Icon = getPlatformIconComponentForName(name)

  if (Icon) {
    return (
      <Icon
        className={className}
        style={{ width: `${size}px`, height: `${size}px` }}
        aria-hidden
      />
    )
  }

  // Fallback: show first letter
  const fontSize = Math.round(size * 0.75)
  return (
    <span
      className={cn("text-background bg-foreground font-semi", className)}
      style={{ fontSize: `${fontSize}px` }}
    >
      {name.charAt(0)}
    </span>
  )
}
