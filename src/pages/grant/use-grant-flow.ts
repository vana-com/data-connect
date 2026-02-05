import { useCallback, useEffect, useRef, useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"
import { useDispatch } from "react-redux"
import { useAuth } from "../../hooks/useAuth"
import { setAuthenticated } from "../../state/store"
import {
  approveSession,
  getSessionInfo,
  SessionRelayError,
} from "../../services/sessionRelay"
import { prepareGrantMessage } from "../../services/grantSigning"
import { setConnectedApp } from "../../lib/storage"
import type { ConnectedApp } from "../../types"
import { DEFAULT_APP_ID, getAppRegistryEntry } from "../../apps/registry"
import type {
  GrantFlowParams,
  GrantFlowState,
  GrantSession,
  GrantStep,
} from "./types"
import { ROUTES } from "@/config/routes"

const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID
const PRIVY_CLIENT_ID = import.meta.env.VITE_PRIVY_CLIENT_ID
const DEV_AUTH_PAGE_URL = "http://localhost:5175"

export function useGrantFlow(params: GrantFlowParams) {
  const dispatch = useDispatch()
  const { isAuthenticated, isLoading: authLoading, walletAddress } = useAuth()
  const [flowState, setFlowState] = useState<GrantFlowState>({
    sessionId: "",
    status: "loading",
  })
  const [currentStep, setCurrentStep] = useState<GrantStep>(1)
  const authTriggered = useRef(false)
  const [isApproving, setIsApproving] = useState(false)
  const [authPending, setAuthPending] = useState(false)
  const [authUrl, setAuthUrl] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)

  const sessionId = params?.sessionId
  const appId = params?.appId
  const scopesKey = params?.scopes?.join("|") ?? ""

  useEffect(() => {
    authTriggered.current = false
    setAuthUrl(null)
    setAuthError(null)
    setAuthPending(false)
  }, [sessionId])

  useEffect(() => {
    if (!sessionId) {
      setFlowState({
        sessionId: "",
        status: "error",
        error: "No session ID provided. Please restart the flow from the app.",
      })
      return
    }

    const loadSession = async () => {
      try {
        setFlowState({ sessionId, status: "loading" })

        // Check if this is a local demo app (sessionId starts with 'grant-session-')
        // For demo apps, use mock session data instead of fetching from relay
        let session: GrantSession
        if (sessionId.startsWith("grant-session-")) {
          // Mock session data for local demo apps
          const resolvedAppId = appId || DEFAULT_APP_ID
          const appInfo = getAppRegistryEntry(resolvedAppId)
          const scopes =
            params.scopes && params.scopes.length > 0
              ? params.scopes
              : appInfo?.scopes || ["read:data"]
          session = {
            id: sessionId,
            appId: resolvedAppId,
            appName: appInfo?.name || resolvedAppId,
            appIcon: appInfo?.icon || "🔗",
            scopes,
            expiresAt: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000
            ).toISOString(), // 30 days
          }
        } else {
          const fetchedSession = await getSessionInfo(sessionId)
          if (!fetchedSession) {
            throw new Error("Session not found")
          }
          session = fetchedSession
        }
        setFlowState(prev => ({ ...prev, session, sessionId }))
      } catch (error) {
        setFlowState({
          sessionId,
          status: "error",
          error:
            error instanceof SessionRelayError
              ? error.message
              : "Failed to load session",
        })
      }
    }

    loadSession()
  }, [sessionId, appId, scopesKey])

  useEffect(() => {
    if (!flowState.session || authLoading) return
    if (flowState.status === "success" || flowState.status === "error") return
    if (flowState.status === "signing") return

    if (flowState.status === "auth-required") return
    const nextStatus = "consent"
    setFlowState(prev =>
      prev.status === nextStatus ? prev : { ...prev, status: nextStatus }
    )
    setCurrentStep(2)
  }, [authLoading, flowState.session, flowState.status])

  const startBrowserAuth = useCallback(async () => {
    if (!PRIVY_APP_ID || !PRIVY_CLIENT_ID) {
      setAuthError("Missing VITE_PRIVY_APP_ID or VITE_PRIVY_CLIENT_ID.")
      return
    }

    setAuthError(null)
    try {
      const url = await invoke<string>("start_browser_auth", {
        privyAppId: PRIVY_APP_ID,
        privyClientId: PRIVY_CLIENT_ID,
      })
      setAuthUrl(url)
    } catch (err) {
      if (import.meta.env.DEV) {
        setAuthUrl(DEV_AUTH_PAGE_URL)
        if (typeof window !== "undefined") {
          window.open(DEV_AUTH_PAGE_URL, "_blank", "noopener,noreferrer")
        }
        return
      }
      console.error("Failed to start browser auth:", err)
      setAuthError(
        err instanceof Error
          ? err.message
          : "Failed to open browser for authentication."
      )
      authTriggered.current = false
    }
  }, [])

  // Auto-start browser auth when auth is required
  useEffect(() => {
    if (flowState.status !== "auth-required" || authTriggered.current) return
    authTriggered.current = true
    startBrowserAuth()
  }, [flowState.status, startBrowserAuth])

  // Listen for auth completion from browser
  useEffect(() => {
    const unlisten = listen<{
      success: boolean
      user?: { id: string; email: string | null }
      walletAddress?: string
      masterKeySignature?: string
      error?: string
    }>("auth-complete", event => {
      const result = event.payload
      if (result.success && result.user) {
        dispatch(
          setAuthenticated({
            user: { id: result.user.id, email: result.user.email || undefined },
            walletAddress: result.walletAddress || null,
            masterKeySignature: result.masterKeySignature || null,
          })
        )
      }
    })
    return () => {
      unlisten.then(fn => fn())
    }
  }, [dispatch])

  const handleApprove = useCallback(async () => {
    if (!flowState.session) return
    if (!isAuthenticated || !walletAddress) {
      setAuthPending(true)
      setFlowState(prev => ({ ...prev, status: "auth-required" }))
      return
    }

    setIsApproving(true)
    setFlowState(prev => ({ ...prev, status: "signing" }))
    setCurrentStep(3)

    try {
      const grantData = {
        sessionId: flowState.session.id,
        appId: flowState.session.appId,
        scopes: flowState.session.scopes,
        expiresAt: flowState.session.expiresAt,
        walletAddress,
      }

      // Prepare the grant message
      const typedData = prepareGrantMessage(grantData)

      // For now, we'll use a placeholder signature
      // In production, this would use the Privy wallet to sign
      const typedDataString = JSON.stringify(typedData)
      const mockSignature =
        `0x${typedDataString}${"0".repeat(Math.max(0, 130 - typedDataString.length))}`.slice(
          0,
          132
        )

      // Skip relay call for local demo sessions
      if (!flowState.sessionId.startsWith("grant-session-")) {
        await approveSession({
          sessionId: flowState.sessionId,
          walletAddress,
          grantSignature: mockSignature,
        })
      }

      setFlowState(prev => ({ ...prev, status: "success" }))

      // Add to connected apps (this would normally come from the backend)
      const newApp: ConnectedApp = {
        id: flowState.session.appId,
        name: flowState.session.appName,
        icon: flowState.session.appIcon,
        permissions: flowState.session.scopes,
        connectedAt: new Date().toISOString(),
      }

      // Store in versioned storage
      setConnectedApp(newApp)
    } catch (error) {
      setFlowState({
        sessionId: flowState.sessionId,
        status: "error",
        error:
          error instanceof SessionRelayError
            ? error.message
            : "Failed to approve session",
      })
    } finally {
      setIsApproving(false)
    }
  }, [flowState.session, flowState.sessionId, isAuthenticated, walletAddress])

  useEffect(() => {
    if (!authPending || !isAuthenticated || !walletAddress) return
    setAuthPending(false)
    void handleApprove()
  }, [authPending, handleApprove, isAuthenticated, walletAddress])

  const declineHref = flowState.session?.appId
    ? ROUTES.app(flowState.session.appId)
    : ROUTES.home

  return {
    flowState,
    currentStep,
    isApproving,
    authUrl,
    authError,
    startBrowserAuth,
    handleApprove,
    declineHref,
    authLoading,
    walletAddress,
  }
}
