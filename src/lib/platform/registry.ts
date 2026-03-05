export type PlatformRegistryAvailability =
  | "available"
  | "comingSoon"
  | "requiresConnector"

export interface PlatformRegistryEntry {
  id: string
  displayName: string
  brandDomain?: string
  iconKey?: string
  platformIds?: string[]
  aliases?: string[]
  // Currently unused by runtime rendering/selection flows; retained for team metadata workflows.
  availability?: PlatformRegistryAvailability
  // Currently unused by runtime rendering/selection flows; retained for team metadata workflows.
  showInConnectList?: boolean
  ingestScope?: string
}

export const PLATFORM_REGISTRY: PlatformRegistryEntry[] = [
  {
    id: "chatgpt",
    displayName: "ChatGPT",
    brandDomain: "chatgpt.com",
    iconKey: "chatgpt",
    platformIds: ["chatgpt-playwright", "chatgpt"],
    aliases: ["openai"],
    availability: "requiresConnector",
    showInConnectList: true,
    ingestScope: "chatgpt.conversations",
  },
  {
    id: "instagram",
    displayName: "Instagram",
    brandDomain: "instagram.com",
    iconKey: "instagram",
    platformIds: ["instagram-playwright", "instagram"],
    aliases: ["meta"],
    availability: "requiresConnector",
    showInConnectList: true,
    ingestScope: "instagram.posts",
  },
  {
    id: "github",
    displayName: "GitHub",
    brandDomain: "github.com",
    iconKey: "github",
    platformIds: ["github-playwright", "github"],
    availability: "requiresConnector",
    showInConnectList: true,
    ingestScope: "github.profile",
  },
  {
    id: "linkedin",
    displayName: "LinkedIn",
    brandDomain: "linkedin.com",
    iconKey: "linkedin",
    platformIds: ["linkedin-playwright", "linkedin"],
    availability: "requiresConnector",
    showInConnectList: true,
    ingestScope: "linkedin.profile",
  },
  {
    id: "spotify",
    displayName: "Spotify",
    brandDomain: "spotify.com",
    iconKey: "spotify",
    platformIds: ["spotify-playwright", "spotify"],
    availability: "requiresConnector",
    showInConnectList: true,
    ingestScope: "spotify.savedTracks",
  },
  {
    id: "x",
    displayName: "X (Twitter)",
    brandDomain: "x.com",
    iconKey: "x",
    platformIds: ["x"],
    aliases: ["x (twitter)"],
  },
  {
    id: "twitter",
    displayName: "Twitter",
    brandDomain: "twitter.com",
    platformIds: ["twitter"],
  },
  {
    id: "reddit",
    displayName: "Reddit",
    brandDomain: "reddit.com",
    platformIds: ["reddit"],
  },
  {
    id: "facebook",
    displayName: "Facebook",
    brandDomain: "facebook.com",
    platformIds: ["facebook"],
  },
  {
    id: "google",
    displayName: "Google",
    brandDomain: "google.com",
    platformIds: ["google"],
  },
  {
    id: "tiktok",
    displayName: "TikTok",
    brandDomain: "tiktok.com",
    platformIds: ["tiktok"],
  },
  {
    id: "youtube",
    displayName: "YouTube",
    brandDomain: "youtube.com",
    platformIds: ["youtube"],
  },
  {
    id: "oura",
    displayName: "Oura Ring",
    brandDomain: "ouraring.com",
    platformIds: ["oura-playwright", "oura"],
    aliases: ["ouraring"],
    availability: "requiresConnector",
    showInConnectList: true,
    ingestScope: "oura.readiness",
  },
  {
    id: "shop",
    displayName: "Shop",
    brandDomain: "shop.app",
    iconKey: "shop",
    platformIds: ["shop-playwright", "shop"],
    aliases: ["shopify"],
    availability: "requiresConnector",
    showInConnectList: true,
    ingestScope: "shop.orders",
  },
]
