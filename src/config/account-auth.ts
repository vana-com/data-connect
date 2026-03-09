import { ROUTES } from "@/config/routes"

export const PERSONAL_SERVER_AUTH_SESSION_ID = "local-server-auth"

const AUTH_REDIRECT_ROUTE_BY_SESSION_ID: Record<string, string> = {
  [PERSONAL_SERVER_AUTH_SESSION_ID]: ROUTES.personalServer,
}

export function getAuthRedirectRoute(sessionId: string | null | undefined) {
  if (!sessionId) return null

  return AUTH_REDIRECT_ROUTE_BY_SESSION_ID[sessionId] ?? null
}
