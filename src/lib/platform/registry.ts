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

import { PLATFORM_REGISTRY_GENERATED } from "./registry.generated"

const PLATFORM_REGISTRY_COMING_SOON: PlatformRegistryEntry[] = [
  {
    id: "x",
    displayName: "X (Twitter)",
    brandDomain: "x.com",
    iconKey: "x",
    platformIds: ["x"],
    aliases: ["x (twitter)"],
    availability: "comingSoon",
  },
  {
    id: "twitter",
    displayName: "Twitter",
    brandDomain: "twitter.com",
    platformIds: ["twitter"],
    availability: "comingSoon",
  },
  {
    id: "reddit",
    displayName: "Reddit",
    brandDomain: "reddit.com",
    platformIds: ["reddit"],
    availability: "comingSoon",
  },
  {
    id: "facebook",
    displayName: "Facebook",
    brandDomain: "facebook.com",
    platformIds: ["facebook"],
    availability: "comingSoon",
  },
  {
    id: "google",
    displayName: "Google",
    brandDomain: "google.com",
    platformIds: ["google"],
    availability: "comingSoon",
  },
  {
    id: "tiktok",
    displayName: "TikTok",
    brandDomain: "tiktok.com",
    platformIds: ["tiktok"],
    availability: "comingSoon",
  },
]

export const PLATFORM_REGISTRY: PlatformRegistryEntry[] = [
  ...PLATFORM_REGISTRY_GENERATED,
  ...PLATFORM_REGISTRY_COMING_SOON,
]
