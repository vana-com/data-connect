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
  // Demo flow (throwaway — for video recording)
  demo: "/demo",
  demoConnect: "/demo/connect",
  demoAuth: "/demo/auth",
  demoConsent: "/demo/consent",
  demoSuccess: "/demo/success",
} as const

export type StaticRoute = keyof typeof ROUTES
