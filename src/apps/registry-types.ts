export type AppRequiredPlatform = {
  token: string
  label: string
}

export type BaseAppRegistryEntry = {
  id: string
  name: string
  icon: string
  iconUrl?: string
  builderName?: string
  builderUrl?: string
  description: string
  category: string
  dataRequired: AppRequiredPlatform[]
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
