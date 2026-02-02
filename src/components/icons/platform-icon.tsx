import { PlatformChatGPTIcon } from "./platform-chatgpt"
import { PlatformInstagramGlyphIcon } from "./platform-instagram-glyph"
import { PlatformLinkedinIcon } from "./platform-linkedin"
import { PlatformSpotifyIcon } from "./platform-spotify"

/**
 * Shared platform icon utilities for displaying connector icons.
 * Used by Home.tsx and ConnectorUpdates.tsx.
 */

function getPlatformIconComponent(platformName: string) {
  const name = platformName.toLowerCase()
  if (name.includes("chatgpt")) return PlatformChatGPTIcon
  if (name.includes("instagram")) return PlatformInstagramGlyphIcon
  if (name.includes("linkedin")) return PlatformLinkedinIcon
  if (name.includes("spotify")) return PlatformSpotifyIcon
  return null
}

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
export function PlatformIcon({ name, size = 24, className }: PlatformIconProps) {
  const Icon = getPlatformIconComponent(name)

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
      className={className}
      style={{ fontSize: `${fontSize}px`, fontWeight: 600, color: "#6b7280" }}
    >
      {name.charAt(0)}
    </span>
  )
}
