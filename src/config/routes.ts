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
  login: "/login",
  browserLogin: "/browser-login",
} as const

export type StaticRoute = keyof typeof ROUTES
