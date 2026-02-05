export const ROUTES = {
  home: "/",
  apps: "/apps",
  appRoute: "/apps/:appId",
  app: (appId: string) => `/apps/${appId}` as const,
  mcp: "/mcp",
  docs: "/docs",
  runs: "/runs",
  settings: "/settings",
  connect: "/connect",
  grant: "/grant",
  login: "/login",
  browserLogin: "/browser-login",
  rickrollMockRoot: "/rickroll",
  rickrollMockSignIn: "/signin",
} as const

export type StaticRoute = (typeof ROUTES)[Exclude<keyof typeof ROUTES, "app">]
