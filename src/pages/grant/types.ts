export interface BuilderManifest {
  name: string
  description?: string
  icons?: Array<{ src: string; sizes?: string; type?: string }>
  appUrl: string
  privacyPolicyUrl?: string
  termsUrl?: string
  supportUrl?: string
  /** false when builder verification failed and fallback metadata is used */
  verified?: boolean
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
    | "preparing-server"
    | "creating-grant"
    | "success"
    | "error"
  error?: string
  session?: GrantSession
  builderManifest?: BuilderManifest
  grantId?: string
}

export interface GrantFlowParams {
  sessionId?: string
  secret?: string
  appId?: string
  scopes?: string[]
  status?: "success"
  contractGatedParams?: Record<string, string>
}

/** Pre-fetched session + builder data handed off from the connect page.
 *  builderManifest is optional — if builder verification failed during pre-fetch,
 *  only the session is passed so the grant flow can skip re-claiming. */
export interface PrefetchedGrantData {
  session: GrantSession
  builderManifest?: BuilderManifest
}
