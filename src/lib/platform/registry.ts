export type PlatformRegistryAvailability =
  | "available"
  | "comingSoon"
  | "requiresConnector"

export interface PlatformRegistryEntry {
  id: string
  displayName: string
  iconKey?: string
  iconEmoji: string
  primaryColor: string
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
    primaryColor: "#0d45d3",
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
    primaryColor: "#E4405F",
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
    primaryColor: "#0A66C2",
    platformIds: ["linkedin-playwright", "linkedin"],
    availability: "requiresConnector",
    showInConnectList: true,
    ingestScope: "linkedin.profile",
  },
  {
    id: "spotify",
    displayName: "Spotify",
    iconKey: "spotify",
    iconEmoji: "🎵",
    primaryColor: "#1DB954",
    platformIds: ["spotify-playwright", "spotify"],
    availability: "requiresConnector",
    showInConnectList: true,
  },
  {
    id: "x",
    displayName: "X (Twitter)",
    iconKey: "x",
    iconEmoji: "𝕏",
    primaryColor: "#111111",
    platformIds: ["x"],
    aliases: ["x (twitter)"],
  },
  {
    id: "twitter",
    displayName: "Twitter",
    iconEmoji: "🐦",
    primaryColor: "#1D9BF0",
    platformIds: ["twitter"],
  },
  {
    id: "reddit",
    displayName: "Reddit",
    iconEmoji: "🔴",
    primaryColor: "#FF4500",
    platformIds: ["reddit"],
  },
  {
    id: "facebook",
    displayName: "Facebook",
    iconEmoji: "👤",
    primaryColor: "#1877F2",
    platformIds: ["facebook"],
  },
  {
    id: "google",
    displayName: "Google",
    iconEmoji: "🔵",
    primaryColor: "#4285F4",
    platformIds: ["google"],
  },
  {
    id: "tiktok",
    displayName: "TikTok",
    iconEmoji: "🎵",
    primaryColor: "#EE1D52",
    platformIds: ["tiktok"],
  },
  {
    id: "youtube",
    displayName: "YouTube",
    iconEmoji: "▶️",
    primaryColor: "#FF0000",
    platformIds: ["youtube"],
  },
]
