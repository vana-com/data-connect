export const ROUTES = {
  home: "/",
  apps: "/apps",
  mcp: "/mcp",
  docs: "/docs",
  runs: "/runs",
  source: "/sources/:platformId",
  settings: "/settings",
  connect: "/connect",
  grant: "/grant",
  login: "/login",
  browserLogin: "/browser-login",
  rickrollMockRoot: "/rickroll",
  rickrollMockSignIn: "/rickroll/signin",
} as const

export type StaticRoute = keyof typeof ROUTES
