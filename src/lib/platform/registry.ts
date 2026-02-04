export type PlatformRegistryAvailability =
  | "available"
  | "comingSoon"
  | "requiresConnector"

export interface PlatformRegistryEntry {
  id: string
  displayName: string
  iconKey?: string
  iconEmoji: string
  platformIds?: string[]
  aliases?: string[]
  availability?: PlatformRegistryAvailability
  showInConnectList?: boolean
  ingestScope?: string
}

export const PLATFORM_REGISTRY: PlatformRegistryEntry[] = [
  {
    id: "chatgpt",
    displayName: "ChatGPT",
    iconKey: "chatgpt",
    iconEmoji: "🤖",
    platformIds: ["chatgpt-playwright", "chatgpt"],
    aliases: ["openai"],
    availability: "requiresConnector",
    showInConnectList: true,
    ingestScope: "chatgpt.conversations",
  },
  {
    id: "instagram",
    displayName: "Instagram",
    iconKey: "instagram",
    iconEmoji: "📸",
    platformIds: ["instagram-playwright", "instagram"],
    aliases: ["meta"],
    availability: "requiresConnector",
    showInConnectList: true,
    ingestScope: "instagram.posts",
  },
  {
    id: "linkedin",
    displayName: "LinkedIn",
    iconKey: "linkedin",
    iconEmoji: "💼",
    platformIds: ["linkedin-playwright", "linkedin"],
    availability: "comingSoon",
    showInConnectList: true,
    ingestScope: "linkedin.profile",
  },
  {
    id: "spotify",
    displayName: "Spotify",
    iconKey: "spotify",
    iconEmoji: "🎵",
    platformIds: ["spotify"],
    availability: "comingSoon",
    showInConnectList: true,
  },
  {
    id: "x",
    displayName: "X (Twitter)",
    iconKey: "x",
    iconEmoji: "𝕏",
    platformIds: ["x"],
    aliases: ["x (twitter)"],
  },
  {
    id: "twitter",
    displayName: "Twitter",
    iconEmoji: "🐦",
    platformIds: ["twitter"],
  },
  {
    id: "reddit",
    displayName: "Reddit",
    iconEmoji: "🔴",
    platformIds: ["reddit"],
  },
  {
    id: "facebook",
    displayName: "Facebook",
    iconEmoji: "👤",
    platformIds: ["facebook"],
  },
  {
    id: "google",
    displayName: "Google",
    iconEmoji: "🔵",
    platformIds: ["google"],
  },
  {
    id: "tiktok",
    displayName: "TikTok",
    iconEmoji: "🎵",
    platformIds: ["tiktok"],
  },
  {
    id: "youtube",
    displayName: "YouTube",
    iconEmoji: "▶️",
    platformIds: ["youtube"],
  },
]
