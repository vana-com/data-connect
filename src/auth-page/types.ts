export type AuthView = "loading" | "login" | "success"

export interface AuthConfig {
  privyAppId: string
  privyClientId: string
}

export interface AuthUser {
  id: string
  email?: string | null
}

export interface AuthResult {
  success: boolean
  user?: AuthUser
  walletAddress?: string | null
  authToken?: string | null
  masterKeySignature?: string | null
  error?: string
}

declare global {
  interface Window {
    __AUTH_CONFIG__?: AuthConfig
  }
}
