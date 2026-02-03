import type { PlatformDisplay } from "./types"

export const PLATFORM_DISPLAY: Record<string, PlatformDisplay> = {
  chatgpt: {
    icon: "🤖",
    iconClassName: "bg-accent/10 text-accent",
    displayName: "ChatGPT",
  },
  x: {
    icon: "𝕏",
    iconClassName: "bg-foreground/5 text-foreground",
    displayName: "X (Twitter)",
  },
  twitter: {
    icon: "🐦",
    iconClassName: "bg-accent/10 text-accent",
    displayName: "Twitter",
  },
  reddit: {
    icon: "🔴",
    iconClassName: "bg-destructive/10 text-destructive",
    displayName: "Reddit",
  },
  linkedin: {
    icon: "💼",
    iconClassName: "bg-muted text-foreground",
    displayName: "LinkedIn",
  },
  facebook: {
    icon: "👤",
    iconClassName: "bg-muted text-foreground",
    displayName: "Facebook",
  },
  google: {
    icon: "🔵",
    iconClassName: "bg-accent/10 text-accent",
    displayName: "Google",
  },
  instagram: {
    icon: "📸",
    iconClassName: "bg-muted text-foreground",
    displayName: "Instagram",
  },
  tiktok: {
    icon: "🎵",
    iconClassName: "bg-foreground/5 text-foreground",
    displayName: "TikTok",
  },
  youtube: {
    icon: "▶️",
    iconClassName: "bg-destructive/10 text-destructive",
    displayName: "YouTube",
  },
}

export function getPlatformDisplay(platform: {
  id: string
  name: string
}): PlatformDisplay {
  return (
    PLATFORM_DISPLAY[platform.id] || {
      icon: "📦",
      iconClassName: "bg-muted text-foreground",
      displayName: platform.name,
    }
  )
}
