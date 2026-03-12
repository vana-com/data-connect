export const ROUTES = {
  home: "/",
  debugLoading: "/__loading",
  apps: "/apps",
  personalServer: "/personal-server",
  docs: "/docs",
  source: "/sources/:platformId",
  settings: "/settings",
  connect: "/connect",
  embrowse: "/embrowse",
  grant: "/grant",
} as const

export type StaticRoute = keyof typeof ROUTES
