export interface BuilderManifest {
  name: string
  icons?: Array<{ src: string; sizes?: string; type?: string }>
  appUrl: string
  privacyPolicyUrl?: string
  termsUrl?: string
  supportUrl?: string
}

export interface GrantSession {
  id: string
  granteeAddress: string
  scopes: string[]
  expiresAt: string
  webhookUrl?: string
  appUserId?: string
  // Legacy fields kept for demo mode compatibility
  appId?: string
  appName?: string
  appIcon?: string
}

export interface GrantFlowState {
  sessionId: string
  secret?: string
  status:
    | "loading"
    | "claiming"
    | "verifying-builder"
    | "consent"
    | "auth-required"
    | "creating-grant"
    | "approving"
    | "success"
    | "error"
    | "denied"
  error?: string
  session?: GrantSession
  builderManifest?: BuilderManifest
  grantId?: string
}

export type GrantStep = 1 | 2 | 3 | 4 | 5

export interface GrantFlowParams {
  sessionId?: string
  secret?: string
  appId?: string
  scopes?: string[]
  status?: "success"
}

/** Pre-fetched session + builder data passed via navigation state from the connect page. */
export interface PrefetchedGrantData {
  session: GrantSession
  builderManifest: BuilderManifest
}
