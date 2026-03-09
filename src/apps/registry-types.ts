export type BaseAppRegistryEntry = {
  id: string
  name: string
  icon: string
  iconUrl?: string
  description: string
  category: string
  dataRequired: string[]
  scopes?: string[]
}

export type LiveAppRegistryEntry = BaseAppRegistryEntry & {
  status: "live"
  externalUrl: string
  scopes: string[]
}

export type ComingSoonAppRegistryEntry = BaseAppRegistryEntry & {
  status: "coming-soon"
  externalUrl?: never
}

export type AppRegistryEntry = LiveAppRegistryEntry | ComingSoonAppRegistryEntry
