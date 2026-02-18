import { getVersion } from "@tauri-apps/api/app"
import { invoke } from "@tauri-apps/api/core"
import { useCallback, useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router"
import { useAuth } from "@/hooks/useAuth"
import { usePersonalServer } from "@/hooks/usePersonalServer"
import { useConnectedApps } from "@/hooks/useConnectedApps"
import { ROUTES } from "@/config/routes"
import { openLocalPath, openExternalUrl } from "@/lib/open-resource"
import { getUserDataPath } from "@/lib/tauri-paths"
import type { BrowserSession, BrowserStatus, NodeJsTestResult, SettingsSection } from "./types"
import {
  DEFAULT_SETTINGS_SECTION,
  SETTINGS_SECTION_PARAM,
  isSettingsSection,
} from "./url"

const IMPORTS_SECTION: SettingsSection = "imports"

export function useSettingsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, logout, isAuthenticated, walletAddress } = useAuth()
  const personalServer = usePersonalServer()
  const { connectedApps, fetchConnectedApps, removeApp } = useConnectedApps()
  const sectionParam = searchParams.get(SETTINGS_SECTION_PARAM)
  const activeSection = isSettingsSection(sectionParam)
    ? sectionParam
    : DEFAULT_SETTINGS_SECTION
  const [dataPath, setDataPath] = useState<string>("")
  const [appVersion, setAppVersion] = useState<string>("")
  const [nodeTestStatus, setNodeTestStatus] = useState<
    "idle" | "testing" | "success" | "error"
  >("idle")
  const [nodeTestResult, setNodeTestResult] = useState<NodeJsTestResult | null>(null)
  const [nodeTestError, setNodeTestError] = useState<string | null>(null)
  const [pathsDebug, setPathsDebug] = useState<Record<string, unknown> | null>(null)
  const [browserStatus, setBrowserStatus] = useState<BrowserStatus | null>(null)
  const [browserSessions, setBrowserSessions] = useState<BrowserSession[]>([])
  const [simulateNoChrome, setSimulateNoChrome] = useState(false)

  useEffect(() => {
    let cancelled = false

    const loadSettings = async () => {
      const [dataPathResult, versionResult] = await Promise.allSettled([
        getUserDataPath(),
        getVersion(),
      ])

      if (cancelled) return

      if (dataPathResult.status === "fulfilled") {
        setDataPath(dataPathResult.value)
      } else {
        console.error("Failed to get user data path:", dataPathResult.reason)
      }

      if (versionResult.status === "fulfilled") {
        setAppVersion(versionResult.value)
      } else {
        console.error("Failed to get app version:", versionResult.reason)
      }
    }

    loadSettings()

    return () => {
      cancelled = true
    }
  }, [])

  const openDataFolder = useCallback(async () => {
    if (!dataPath) return
    await openLocalPath(dataPath)
  }, [dataPath])

  const testNodeJs = useCallback(async () => {
    setNodeTestStatus("testing")
    setNodeTestResult(null)
    setNodeTestError(null)
    try {
      const result = await invoke<NodeJsTestResult>("test_nodejs")
      setNodeTestResult(result)
      setNodeTestStatus("success")
    } catch (error) {
      setNodeTestError(String(error))
      setNodeTestStatus("error")
    }
  }, [])

  const debugPaths = useCallback(async () => {
    try {
      const result = await invoke<Record<string, unknown>>("debug_connector_paths")
      setPathsDebug(result)
    } catch (error) {
      console.error("Debug paths error:", error)
    }
  }, [])

  // Fetch connected apps from Personal Server when available
  useEffect(() => {
    if (personalServer.port && personalServer.status === "running") {
      fetchConnectedApps(personalServer.port, personalServer.devToken)
    }
  }, [personalServer.port, personalServer.status, personalServer.devToken, fetchConnectedApps])

  // Persist simulateNoChrome to localStorage — only store when explicitly true.
  // Remove the key when false so a fresh profile starts with the correct default.
  useEffect(() => {
    if (simulateNoChrome) {
      localStorage.setItem("dataconnect_simulate_no_chrome", "true")
    } else {
      localStorage.removeItem("dataconnect_simulate_no_chrome")
    }
  }, [simulateNoChrome])

  useEffect(() => {
    let cancelled = false

    const checkBrowser = async () => {
      try {
        const result = await invoke<BrowserStatus & { needs_download: boolean }>(
          "check_browser_available",
          { simulateNoChrome }
        )
        if (!cancelled) {
          setBrowserStatus(result)
        }
      } catch (error) {
        console.error("Browser check error:", error)
      }
    }

    checkBrowser()

    return () => {
      cancelled = true
    }
  }, [simulateNoChrome])

  const loadBrowserSessions = useCallback(async () => {
    try {
      const sessions = await invoke<BrowserSession[]>("list_browser_sessions")
      setBrowserSessions(sessions)
    } catch (error) {
      console.error("Failed to load browser sessions:", error)
    }
  }, [])

  useEffect(() => {
    loadBrowserSessions()
  }, [loadBrowserSessions])

  const handleClearSession = useCallback(async (connectorId: string) => {
    try {
      await invoke("clear_browser_session", { connectorId })
      await loadBrowserSessions()
    } catch (error) {
      console.error("Failed to clear browser session:", error)
    }
  }, [loadBrowserSessions])

  const checkBrowserStatus = useCallback(async () => {
    try {
      const result = await invoke<BrowserStatus & { needs_download: boolean }>(
        "check_browser_available",
        { simulateNoChrome }
      )
      setBrowserStatus(result)
    } catch (error) {
      console.error("Browser check error:", error)
    }
  }, [simulateNoChrome])

  const handleRevokeApp = useCallback((appId: string) => {
    removeApp(appId, personalServer.port)
  }, [removeApp, personalServer.port])

  const handleLogout = useCallback(async () => {
    await logout()
    navigate(ROUTES.home)
  }, [logout, navigate])

  const handleSignIn = useCallback(() => {
    const accountUrl =
      import.meta.env.VITE_ACCOUNT_URL || "https://account.vana.org"
    openExternalUrl(accountUrl)
  }, [])

  const setActiveSection = useCallback(
    (nextSection: SettingsSection) => {
      const nextSearchParams = new URLSearchParams(searchParams)
      if (nextSection !== IMPORTS_SECTION) {
        nextSearchParams.delete("source")
      }
      if (nextSection === DEFAULT_SETTINGS_SECTION) {
        nextSearchParams.delete(SETTINGS_SECTION_PARAM)
      } else {
        nextSearchParams.set(SETTINGS_SECTION_PARAM, nextSection)
      }
      setSearchParams(nextSearchParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  return {
    activeSection,
    setActiveSection,
    dataPath,
    appVersion,
    nodeTestStatus,
    nodeTestResult,
    nodeTestError,
    pathsDebug,
    browserStatus,
    simulateNoChrome,
    browserSessions,
    connectedApps,
    personalServer,
    user,
    isAuthenticated,
    walletAddress,
    onOpenDataFolder: openDataFolder,
    onTestNodeJs: testNodeJs,
    onDebugPaths: debugPaths,
    onCheckBrowserStatus: checkBrowserStatus,
    onSimulateNoChromeChange: setSimulateNoChrome,
    onClearBrowserSession: handleClearSession,
    onRevokeApp: handleRevokeApp,
    onLogout: handleLogout,
    onSignIn: handleSignIn,
  }
}
