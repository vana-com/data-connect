export interface GrantSession {
  id: string
  appId: string
  appName: string
  appIcon?: string
  scopes: string[]
  expiresAt: string
}

export interface GrantFlowState {
  sessionId: string
  status: "loading" | "auth-required" | "consent" | "signing" | "success" | "error"
  error?: string
  session?: GrantSession
}

export type GrantStep = 1 | 2 | 3

export interface GrantFlowParams {
  sessionId?: string
  appId?: string
  scopes?: string[]
}
