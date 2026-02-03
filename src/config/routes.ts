export const ROUTES = {
  home: "/",
  apps: "/apps",
  app: (appId: string) => `/apps/${appId}` as const,
  mcp: "/mcp",
  docs: "/docs",
  runs: "/runs",
  settings: "/settings",
  grant: "/grant",
  login: "/login",
  browserLogin: "/browser-login",
} as const

export type StaticRoute = (typeof ROUTES)[Exclude<keyof typeof ROUTES, "app">]
