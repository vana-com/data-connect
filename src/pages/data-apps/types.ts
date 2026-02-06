type BaseMockApp = {
  id: string
  name: string
  description: string
  icon: string
  category: string
  dataRequired: string[]
}

type LiveMockApp = BaseMockApp & {
  status: "live"
  externalUrl: string
}

type ComingSoonMockApp = BaseMockApp & {
  status: "coming-soon"
  externalUrl?: never
}

export type MockApp = LiveMockApp | ComingSoonMockApp
