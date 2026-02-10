import type { ComponentProps } from "react"
import { getPlatformIconComponentForName } from "@/lib/platform/icons"
import { cn } from "@/lib/utils"

/**
 * Shared platform icon utilities for displaying connector icons.
 * Used by Home.tsx and ConnectorUpdates.tsx.
 */

interface PlatformIconProps extends Omit<ComponentProps<"div">, "children"> {
  iconName: string
  size?: number
  fallbackLabel?: string
  fallbackScale?: number
  ariaHidden?: boolean
}

// Default 2px padding to ensure the icon is centered within the wrapper
const iconWrapper = "flex items-center justify-center rounded-button p-1"

/**
 * Platform icon component
 * Displays a platform logo or first-letter fallback
 */
export function PlatformIcon({
  iconName,
  size = 32,
  className,
  fallbackLabel,
  fallbackScale = 0.75,
  ariaHidden,
  "aria-hidden": ariaHiddenProp,
  ...props
}: PlatformIconProps) {
  const Icon = getPlatformIconComponentForName(iconName)
  const resolvedAriaHidden = ariaHidden ?? ariaHiddenProp ?? true

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

  // Fallback: show first letter
  const label = fallbackLabel?.trim() || iconName.charAt(0)
  const fontSize = Math.round(size * fallbackScale)
  return (
    <div
      className={cn(
        iconWrapper,
        "text-background bg-foreground font-semi",
        className
      )}
      aria-hidden={resolvedAriaHidden}
      {...props}
    >
      <span
        className={cn("flex items-center justify-center")}
        style={{
          fontSize: `${fontSize}px`,
          width: `${size}px`,
          height: `${size}px`,
        }}
      >
        <span>{label}</span>
      </span>
    </div>
  )
}
