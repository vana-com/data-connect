import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "react-router"
import {
  usePrivy,
  useLoginWithOAuth,
  useLoginWithEmail,
  useCreateWallet,
  useWallets,
} from "@privy-io/react-auth"
import type { User } from "@privy-io/react-auth"

export function useBrowserLogin() {
  const [searchParams] = useSearchParams()
  const callbackPort = searchParams.get("callbackPort")

  const { authenticated, user, ready } = usePrivy()
  const { wallets } = useWallets()

  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [isCodeSent, setIsCodeSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCreatingWallet, setIsCreatingWallet] = useState(false)
  const [authSent, setAuthSent] = useState(false)

  const { createWallet } = useCreateWallet({
    onSuccess: () => {
      setIsCreatingWallet(false)
    },
    onError: err => {
      console.error("Wallet creation error:", err)
      setIsCreatingWallet(false)
    },
  })

  const ensureEmbeddedWallet = useCallback(
    async (privyUser: User) => {
      const hasEmbeddedWallet = privyUser.linkedAccounts?.some(
        account => account.type === "wallet" && account.walletClientType === "privy"
      )

      if (!hasEmbeddedWallet) {
        setIsCreatingWallet(true)
        try {
          await createWallet()
        } catch (err) {
          console.error("Failed to create embedded wallet:", err)
          setIsCreatingWallet(false)
        }
      }
    },
    [createWallet]
  )

  const { initOAuth, state: oauthState } = useLoginWithOAuth({
    onComplete: async ({ user: privyUser }) => {
      setError(null)
      await ensureEmbeddedWallet(privyUser)
    },
    onError: err => {
      console.error("OAuth Error:", err)
      setError(err || "Login with Google failed.")
    },
  })

  const {
    sendCode,
    loginWithCode,
    state: emailState,
  } = useLoginWithEmail({
    onComplete: async ({ user: privyUser }) => {
      setError(null)
      await ensureEmbeddedWallet(privyUser)
    },
    onError: err => {
      console.error("Email Error:", err)
      setError(err || "Failed to send/verify code.")
    },
  })

  useEffect(() => {
    if (authenticated && user && callbackPort && !authSent && !isCreatingWallet) {
      const embeddedWallet = wallets.find(w => w.walletClientType === "privy")
      const linkedWallet = user.linkedAccounts?.find(
        account => account.type === "wallet" && account.walletClientType === "privy"
      )

      const walletAddress =
        (linkedWallet && "address" in linkedWallet ? linkedWallet.address : null) ||
        embeddedWallet?.address ||
        null

      if (!walletAddress && user.linkedAccounts?.length === 0) {
        return
      }

      const sendAuthResult = async () => {
        try {
          await fetch(`http://localhost:${callbackPort}/auth-callback`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              success: true,
              user: {
                id: user.id,
                email: user.email?.address || null,
              },
              walletAddress,
            }),
          })
          setAuthSent(true)
        } catch (err) {
          console.error("Failed to send auth result:", err)
          setError("Failed to communicate with app. Please try again.")
        }
      }

      sendAuthResult()
    }
  }, [authenticated, user, wallets, callbackPort, authSent, isCreatingWallet])

  const handleGoogleLogin = useCallback(() => {
    setError(null)
    initOAuth({ provider: "google" })
  }, [initOAuth])

  const handleSendCode = useCallback(async () => {
    setError(null)
    try {
      await sendCode({ email })
      setIsCodeSent(true)
    } catch {
      // Error handled by onError callback
    }
  }, [email, sendCode])

  const handleLoginWithCode = useCallback(async () => {
    setError(null)
    try {
      await loginWithCode({ code })
    } catch {
      // Error handled by onError callback
    }
  }, [code, loginWithCode])

  const handleResetEmail = useCallback(() => {
    setIsCodeSent(false)
    setCode("")
    setError(null)
  }, [])

  const isLoading =
    oauthState.status === "loading" ||
    emailState.status === "sending-code" ||
    emailState.status === "submitting-code" ||
    isCreatingWallet

  return {
    // URL params
    callbackPort,
    // Privy state
    ready,
    authenticated,
    // Form state
    email,
    setEmail,
    code,
    setCode,
    isCodeSent,
    error,
    isCreatingWallet,
    authSent,
    // Loading states
    isLoading,
    oauthState,
    emailState,
    // Handlers
    handleGoogleLogin,
    handleSendCode,
    handleLoginWithCode,
    handleResetEmail,
  }
}
