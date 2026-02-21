export const ROUTES = {
  home: "/",
  debugLoading: "/__loading",
  apps: "/apps",
  mcp: "/mcp",
  docs: "/docs",
  source: "/sources/:platformId",
  settings: "/settings",
  connect: "/connect",
  grant: "/grant",
} as const

export type StaticRoute = keyof typeof ROUTES
