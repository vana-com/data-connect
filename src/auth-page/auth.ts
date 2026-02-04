import { useCallback, useEffect, useRef, useState, type RefObject } from "react"
import PrivyClient, { LocalStorage } from "@privy-io/js-sdk-core"
import type { AuthConfig, AuthResult, AuthView } from "./types"

type PrivyLinkedAccount = {
  type: string
  address?: string
  email?: string
  walletClientType?: string
  wallet_client_type?: string
}

type PrivyUser = {
  id: string
  email?: { address?: string | null } | null
  linked_accounts?: PrivyLinkedAccount[]
  linkedAccounts?: PrivyLinkedAccount[]
}

type PrivySession = {
  user: PrivyUser
  accessToken?: string | null
  access_token?: string | null
}

type UseAuthPageState = {
  view: AuthView
  loadingText: string
  error: string | null
  email: string
  code: string
  showCode: boolean
  isSendingEmail: boolean
  isVerifyingCode: boolean
  isGoogleLoading: boolean
  isAppleLoading: boolean
  walletIframeUrl: string | null
  walletIframeRef: RefObject<HTMLIFrameElement>
  handleWalletIframeLoad: () => void
  handleEmailChange: (value: string) => void
  handleCodeChange: (value: string) => void
  handleEmailSubmit: () => Promise<void>
  handleVerifyCode: () => Promise<void>
  handleGoogleLogin: () => Promise<void>
  handleAppleLogin: () => Promise<void>
}

const MASTER_KEY_MESSAGE = "vana-master-key-v1"
const LOGIN_ERROR_MESSAGE = "Failed to initialize authentication."

type CloseTabActions = {
  close?: () => void
  assign?: (url: string) => void
}

export const scheduleCloseTab = (delayMs = 1500, actions: CloseTabActions = {}) => {
  const close = actions.close ?? (() => window.close())
  const assign = actions.assign ?? (url => window.location.assign(url))

  window.setTimeout(() => {
    try {
      assign("/close-tab")
    } catch {
      // ignored
    }
    window.setTimeout(() => {
      try {
        close()
      } catch {
        // ignored
      }
    }, 250)
  }, delayMs)
}

const toHexMessage = (value: string) => {
  const encoded = new TextEncoder().encode(value)
  return `0x${Array.from(encoded)
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("")}`
}

const parseAuthConfig = () => {
  const config = window.__AUTH_CONFIG__
  const privyAppId = (config?.privyAppId ?? "").trim()
  const privyClientId = (config?.privyClientId ?? "").trim()
  const hasPlaceholder = (value: string) => value.includes("%PRIVY_")

  if (!privyAppId || hasPlaceholder(privyAppId)) {
    return { error: "Missing Privy app configuration." }
  }

  if (!privyClientId || hasPlaceholder(privyClientId)) {
    return { error: "Missing Privy client configuration." }
  }

  return { config: { privyAppId, privyClientId } satisfies AuthConfig }
}

export const useAuthPage = (): UseAuthPageState => {
  const [view, setView] = useState<AuthView>("loading")
  const [loadingText, setLoadingText] = useState("Initializing...")
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [showCode, setShowCode] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [isVerifyingCode, setIsVerifyingCode] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isAppleLoading, setIsAppleLoading] = useState(false)
  const [walletIframeUrl, setWalletIframeUrl] = useState<string | null>(null)
  const [walletIframeLoaded, setWalletIframeLoaded] = useState(false)

  const privyRef = useRef<PrivyClient | null>(null)
  const currentEmailRef = useRef("")
  const walletIframeRef = useRef<HTMLIFrameElement>(null)

  const showLoading = useCallback((message: string) => {
    setView("loading")
    setLoadingText(message)
    setError(null)
  }, [])

  const showLoginForm = useCallback(() => {
    setView("login")
  }, [])

  const showSuccess = useCallback(() => {
    setView("success")
  }, [])

  const showError = useCallback((message: string) => {
    setError(message)
    setView("login")
  }, [])

  const handleWalletIframeLoad = useCallback(() => {
    setWalletIframeLoaded(true)
  }, [])

  const createPrivyClient = useCallback(
    async (config: AuthConfig, skipInit: boolean) => {
      const privy = new PrivyClient({
        appId: config.privyAppId,
        clientId: config.privyClientId,
        storage: new LocalStorage(),
      })

      if (!skipInit) {
        try {
          await privy.initialize()
        } catch (initErr) {
          console.log("Privy init (may be expected):", initErr)
        }
      }

      return privy
    },
    []
  )

  const sendAuthResult = useCallback(async (result: AuthResult) => {
    console.log("Sending auth result:", JSON.stringify(result))
    try {
      const resp = await fetch("/auth-callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result),
      })
      console.log("Auth callback response:", resp.status)
    } catch (err) {
      console.error("Failed to send auth result:", err)
      setLoadingText(`Error: ${err instanceof Error ? err.message : "Unknown error"}`)
    }
  }, [])

  const setupWalletIframe = useCallback(async (privy: PrivyClient) => {
    try {
      console.log("[AUTH] setupWalletIframe: starting...")
      console.log(
        "[AUTH] privy.embeddedWallet methods:",
        Object.keys(privy.embeddedWallet || {})
      )
      console.log(
        "[AUTH] privy methods:",
        Object.getOwnPropertyNames(Object.getPrototypeOf(privy))
      )

      const iframeUrl = privy.embeddedWallet.getURL()
      console.log("[AUTH] iframe URL:", iframeUrl)
      setWalletIframeUrl(iframeUrl)

      await new Promise<void>(resolve => {
        let resolved = false
        const timeoutId = window.setTimeout(() => {
          if (resolved) return
          resolved = true
          console.warn("[AUTH] iframe setup timed out after 5s")
          resolve()
        }, 5000)

        const attachListeners = () => {
          const iframe = walletIframeRef.current
          if (!iframe) {
            requestAnimationFrame(attachListeners)
            return
          }

          const handleLoad = () => {
            if (resolved) return
            resolved = true
            window.clearTimeout(timeoutId)
            console.log("[AUTH] iframe loaded")
            try {
              if (iframe.contentWindow) {
                privy.setMessagePoster(iframe.contentWindow)
              }
            } catch (err) {
              console.warn("[AUTH] setMessagePoster error:", err)
            }
            window.setTimeout(resolve, 2000)
          }

          const handleError = (err: Event) => {
            if (resolved) return
            resolved = true
            window.clearTimeout(timeoutId)
            console.error("[AUTH] iframe load error:", err)
            resolve()
          }

          iframe.addEventListener("load", handleLoad, { once: true })
          iframe.addEventListener("error", handleError, { once: true })
        }

        attachListeners()
      })

      console.log("[AUTH] setupWalletIframe: done")
    } catch (err) {
      console.error("[AUTH] Embedded wallet iframe setup failed:", err)
    }
  }, [])

  const registerPersonalServer = useCallback(
    async (privy: PrivyClient, walletAddress: string, walletAccount: PrivyLinkedAccount) => {
      console.log("[AUTH] registerPersonalServer: starting...")
      showLoading("Starting your server...")

      let identity: Record<string, unknown> | null = null
      for (let i = 0; i < 15; i += 1) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        try {
          console.log("[AUTH] Polling /server-identity attempt", i + 1)
          const resp = await fetch("/server-identity")
          console.log("[AUTH] /server-identity response:", resp.status)
          if (resp.ok) {
            identity = await resp.json()
            console.log(
              "[AUTH] Server identity:",
              JSON.stringify(identity).substring(0, 200)
            )
            break
          }
        } catch (err) {
          console.warn("[AUTH] /server-identity fetch error:", err)
        }
      }

      if (!identity) {
        console.warn("[AUTH] Server not ready after 30s, skipping registration")
        return
      }

      const identityRecord = identity as {
        identity?: {
          address?: string
          publicKey?: string
          serverId?: string
          port?: number
        }
        address?: string
        publicKey?: string
        serverId?: string
        port?: number
      }

      const serverAddress = identityRecord.identity?.address ?? identityRecord.address
      const publicKey = identityRecord.identity?.publicKey ?? identityRecord.publicKey
      const serverId = identityRecord.identity?.serverId ?? identityRecord.serverId
      const serverPort = identityRecord.identity?.port ?? identityRecord.port

      if (serverId) {
        console.log("[AUTH] Server already registered:", serverId)
        return
      }

      if (!serverAddress || !publicKey) {
        console.warn("[AUTH] Server identity missing address or publicKey")
        return
      }

      showLoading("Registering your server...")

      const serverUrl = serverPort ? `http://localhost:${serverPort}` : "http://localhost:8080"
      const message = {
        ownerAddress: walletAddress,
        serverAddress,
        publicKey,
        serverUrl,
      }

      const typedData = {
        types: {
          EIP712Domain: [
            { name: "name", type: "string" },
            { name: "version", type: "string" },
            { name: "chainId", type: "uint256" },
            { name: "verifyingContract", type: "address" },
          ],
          ServerRegistration: [
            { name: "ownerAddress", type: "address" },
            { name: "serverAddress", type: "address" },
            { name: "publicKey", type: "string" },
            { name: "serverUrl", type: "string" },
          ],
        },
        domain: {
          name: "Vana Data Portability",
          version: "1",
          chainId: 14800,
          verifyingContract: "0x1483B1F634DBA75AeaE60da7f01A679aabd5ee2c",
        },
        primaryType: "ServerRegistration",
        message,
      }

      await setupWalletIframe(privy)
      const provider = await privy.embeddedWallet.getProvider(walletAccount)
      const signature = await provider.request({
        method: "eth_signTypedData_v4",
        params: [walletAddress, JSON.stringify(typedData)],
      })

      console.log("[AUTH] Server registration signed:", signature?.substring(0, 20) + "...")

      const regResp = await fetch("/register-server", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature, message }),
      })

      if (regResp.status === 409) {
        console.log("[AUTH] Server already registered (409)")
        return
      }

      if (!regResp.ok) {
        const errText = await regResp.text().catch(() => "")
        throw new Error(`Registration failed (${regResp.status}): ${errText}`)
      }

      console.log("[AUTH] Server registered successfully")
    },
    [showLoading, setupWalletIframe]
  )

  const handleAuthenticatedUser = useCallback(
    async (privy: PrivyClient, user: PrivyUser, session?: PrivySession | null) => {
      showLoading("Setting up your wallet...")

      let embeddedWallet = (user.linked_accounts || user.linkedAccounts)?.find(
        account =>
          account.type === "wallet" &&
          (account.walletClientType === "privy" || account.wallet_client_type === "privy")
      )
      let walletAddress = embeddedWallet?.address ?? null

      if (!walletAddress) {
        try {
          await setupWalletIframe(privy)
          const result = await privy.embeddedWallet.create({})
          const createdUser = result.user as PrivyUser
          embeddedWallet = (createdUser.linked_accounts || createdUser.linkedAccounts)?.find(
            account =>
              account.type === "wallet" &&
              (account.walletClientType === "privy" ||
                account.wallet_client_type === "privy")
          )
          walletAddress = embeddedWallet?.address ?? null
        } catch (err) {
          console.error("Failed to create embedded wallet:", err)
        }
      }

      let authToken = session?.accessToken ?? session?.access_token ?? null
      if (!authToken) {
        try {
          authToken = await privy.getAccessToken()
        } catch {
          authToken = null
        }
      }

      let masterKeySignature: string | null = null
      if (walletAddress && embeddedWallet) {
        try {
          showLoading("Signing master key...")
          console.log("[AUTH] Embedded wallet account:", JSON.stringify(embeddedWallet))
          await setupWalletIframe(privy)
          console.log("[AUTH] Getting provider for wallet:", embeddedWallet.address)
          const provider = await privy.embeddedWallet.getProvider(embeddedWallet)
          console.log("[AUTH] Provider obtained:", provider ? "ok" : "null")
          console.log("[AUTH] Requesting personal_sign...")
          masterKeySignature = await provider.request({
            method: "personal_sign",
            params: [toHexMessage(MASTER_KEY_MESSAGE), walletAddress],
          })
          console.log(
            "[AUTH] Master key signed:",
            masterKeySignature?.substring(0, 20) + "..."
          )
        } catch (err) {
          console.error("[AUTH] Master key signing failed:", err)
        }
      }

      await sendAuthResult({
        success: true,
        user: {
          id: user.id,
          email:
            user.email?.address ??
            (user.linked_accounts || user.linkedAccounts)?.find(
              account => account.type === "email"
            )?.address ??
            (user.linked_accounts || user.linkedAccounts)?.find(
              account => account.type === "google_oauth"
            )?.email ??
            (user.linked_accounts || user.linkedAccounts)?.find(
              account => account.type === "apple_oauth"
            )?.email ??
            null,
        },
        walletAddress,
        authToken,
        masterKeySignature,
      })

      if (walletAddress && embeddedWallet) {
        try {
          await registerPersonalServer(privy, walletAddress, embeddedWallet)
        } catch (err) {
          console.warn("[AUTH] Server registration failed (non-fatal):", err)
        }
      }

      showSuccess()
      scheduleCloseTab()
    },
    [registerPersonalServer, sendAuthResult, setupWalletIframe, showLoading, showSuccess]
  )

  const handleOAuthLogin = useCallback(
    async (provider: "google" | "apple") => {
      const privy = privyRef.current
      if (!privy) {
        showError(LOGIN_ERROR_MESSAGE)
        return
      }

      try {
        if (provider === "google") {
          setIsGoogleLoading(true)
        } else {
          setIsAppleLoading(true)
        }

        try {
          await privy.auth.logout()
        } catch {
          // ignore logout failures
        }

        const redirectURI = `${window.location.origin}${window.location.pathname}`
        const result = await privy.auth.oauth.generateURL(provider, redirectURI)
        const url = typeof result === "string" ? result : result.url || result
        window.location.href = url
      } catch (err) {
        console.error(`${provider} login error:`, err)
        showError(
          err instanceof Error
            ? err.message
            : `Failed to sign in with ${provider === "google" ? "Google" : "Apple"}`
        )
      } finally {
        if (provider === "google") {
          setIsGoogleLoading(false)
        } else {
          setIsAppleLoading(false)
        }
      }
    },
    [showError]
  )

  const handleEmailSubmit = useCallback(async () => {
    const privy = privyRef.current
    if (!privy) {
      showError(LOGIN_ERROR_MESSAGE)
      return
    }

    const nextEmail = email.trim()
    if (!nextEmail) {
      showError("Please enter your email.")
      return
    }

    try {
      setIsSendingEmail(true)
      setError(null)
      currentEmailRef.current = nextEmail
      await privy.auth.email.sendCode(nextEmail)
      setShowCode(true)
      setCode("")
    } catch (err) {
      console.error("Send code error:", err)
      showError(err instanceof Error ? err.message : "Failed to send code.")
    } finally {
      setIsSendingEmail(false)
    }
  }, [email, showError])

  const handleVerifyCode = useCallback(async () => {
    const privy = privyRef.current
    if (!privy) {
      showError(LOGIN_ERROR_MESSAGE)
      return
    }

    const trimmedCode = code.trim()
    if (!trimmedCode) {
      showError("Please enter the verification code.")
      return
    }

    try {
      setIsVerifyingCode(true)
      const session = (await privy.auth.email.loginWithCode(
        currentEmailRef.current,
        trimmedCode
      )) as PrivySession
      await handleAuthenticatedUser(privy, session.user, session)
    } catch (err) {
      console.error("Verify code error:", err)
      showError(err instanceof Error ? err.message : "Invalid code.")
    } finally {
      setIsVerifyingCode(false)
    }
  }, [code, handleAuthenticatedUser, showError])

  const handleGoogleLogin = useCallback(async () => {
    await handleOAuthLogin("google")
  }, [handleOAuthLogin])

  const handleAppleLogin = useCallback(async () => {
    await handleOAuthLogin("apple")
  }, [handleOAuthLogin])

  useEffect(() => {
    const init = async () => {
      const configResult = parseAuthConfig()
      if ("error" in configResult) {
        showLoginForm()
        showError(configResult.error)
        return
      }

      const config = configResult.config

      try {
        const queryParams = new URLSearchParams(window.location.search)
        const oauthCode = queryParams.get("privy_oauth_code")
        const oauthState = queryParams.get("privy_oauth_state")

        if (!oauthCode) {
          localStorage.clear()
        }

        const privy = await createPrivyClient(config, !!oauthCode)
        privyRef.current = privy

        if (!oauthCode) {
          try {
            await privy.auth.logout()
          } catch {
            // ignore logout failures
          }
        }

        if (oauthCode && oauthState) {
          showLoading("Completing sign-in...")
          console.log("[AUTH] OAuth callback detected, code:", oauthCode.substring(0, 8) + "...")
          try {
            console.log("[AUTH] Calling loginWithCode...")
            const session = (await privy.auth.oauth.loginWithCode(
              oauthCode,
              oauthState
            )) as PrivySession

            try {
              console.log("[AUTH] Initializing SDK after login...")
              await privy.initialize()
              console.log("[AUTH] SDK initialized successfully")
            } catch (initErr) {
              console.warn("[AUTH] Post-login initialize (may be ok):", initErr)
            }

            await handleAuthenticatedUser(privy, session.user, session)
            return
          } catch (err) {
            console.error("[AUTH] OAuth callback error:", err)
            showError(
              err instanceof Error ? err.message : "Failed to complete OAuth sign-in."
            )
          }
        }

        showLoginForm()
      } catch (err) {
        console.error("Privy initialization error:", err)
        showLoginForm()
        showError(
          err instanceof Error ? `${LOGIN_ERROR_MESSAGE} ${err.message}` : LOGIN_ERROR_MESSAGE
        )
      }
    }

    init()
  }, [createPrivyClient, handleAuthenticatedUser, showError, showLoading, showLoginForm])

  useEffect(() => {
    const privy = privyRef.current
    const iframe = walletIframeRef.current
    if (!privy || !iframe || !walletIframeLoaded) return

    const handleMessage = (event: MessageEvent) => {
      const contentWindow = iframe.contentWindow
      if (!contentWindow || event.source !== contentWindow) return
      try {
        privy.embeddedWallet.onMessage(event.data)
      } catch (err) {
        console.warn("[AUTH] onMessage error:", err)
      }
    }

    if (!iframe.contentWindow) return
    window.addEventListener("message", handleMessage)

    return () => {
      window.removeEventListener("message", handleMessage)
    }
  }, [walletIframeLoaded])

  useEffect(() => {
    setWalletIframeLoaded(false)
  }, [walletIframeUrl])

  return {
    view,
    loadingText,
    error,
    email,
    code,
    showCode,
    isSendingEmail,
    isVerifyingCode,
    isGoogleLoading,
    isAppleLoading,
    walletIframeUrl,
    walletIframeRef,
    handleWalletIframeLoad,
    handleEmailChange: setEmail,
    handleCodeChange: setCode,
    handleEmailSubmit,
    handleVerifyCode,
    handleGoogleLogin,
    handleAppleLogin,
  }
}
