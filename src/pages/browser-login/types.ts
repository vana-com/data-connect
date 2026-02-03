export interface BrowserLoginState {
  email: string
  code: string
  isCodeSent: boolean
  error: string | null
  isCreatingWallet: boolean
  authSent: boolean
}

export interface AuthCallbackPayload {
  success: boolean
  user: {
    id: string
    email: string | null
  }
  walletAddress: string | null
}
