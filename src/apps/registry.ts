type BaseAppRegistryEntry = {
  id: string
  name: string
  icon: string
  description: string
  category: string
  dataRequired: string[]
  scopes?: string[]
}

type LiveAppRegistryEntry = BaseAppRegistryEntry & {
  status: "live"
  externalUrl: string
  scopes: string[]
}

type ComingSoonAppRegistryEntry = BaseAppRegistryEntry & {
  status: "coming-soon"
  externalUrl?: never
}

export type AppRegistryEntry = LiveAppRegistryEntry | ComingSoonAppRegistryEntry

const APP_REGISTRY_LIST: AppRegistryEntry[] = [
  {
    id: "rickroll",
    name: "RickRoll Facts",
    description: "Discover fun facts from your ChatGPT conversations",
    icon: "R",
    category: "Demo",
    status: "live",
    externalUrl: "https://rickroll.vana.com",
    dataRequired: ["ChatGPT"],
    scopes: ["read:chatgpt-conversations"],
  },
  {
    id: "vana-trainer",
    name: "Vana Trainer",
    description: "Train AI models on your personal data",
    icon: "🤖",
    category: "AI Training",
    status: "coming-soon",
    dataRequired: ["ChatGPT", "Reddit", "Twitter"],
  },
  {
    id: "data-broker",
    name: "Data Marketplace",
    description: "Sell access to your data securely",
    icon: "💎",
    category: "Marketplace",
    status: "coming-soon",
    dataRequired: ["Any"],
  },
  {
    id: "personal-assistant",
    name: "Personal AI Assistant",
    description: "Get personalized insights from your data",
    icon: "🧠",
    category: "Productivity",
    status: "coming-soon",
    dataRequired: ["Gmail", "Calendar", "Notion"],
  },
  {
    id: "social-analyzer",
    name: "Social Insights",
    description: "Analyze your social media presence",
    icon: "📊",
    category: "Analytics",
    status: "coming-soon",
    dataRequired: ["Twitter", "LinkedIn", "Reddit"],
  },
  {
    id: "health-tracker",
    name: "Health Data Sync",
    description: "Aggregate and analyze health metrics",
    icon: "❤️",
    category: "Health",
    status: "coming-soon",
    dataRequired: ["Fitbit", "Apple Health"],
  },
  {
    id: "content-creator",
    name: "Content Vault",
    description: "Organize and monetize your content",
    icon: "📁",
    category: "Media",
    status: "coming-soon",
    dataRequired: ["YouTube", "Instagram", "TikTok"],
  },
]

const APP_REGISTRY: Record<string, AppRegistryEntry> = Object.fromEntries(
  APP_REGISTRY_LIST.map(entry => [entry.id, entry])
)

export const DEFAULT_APP_ID = "rickroll"

export function getAppRegistryEntry(
  appId?: string | null
): AppRegistryEntry | null {
  if (!appId) return null
  return APP_REGISTRY[appId] ?? null
}

export function getDefaultAppEntry(): AppRegistryEntry {
  return APP_REGISTRY[DEFAULT_APP_ID]
}

export function getAppRegistryEntries(): AppRegistryEntry[] {
  return APP_REGISTRY_LIST
}
