import { getVersion } from "@tauri-apps/api/app"
import { invoke } from "@tauri-apps/api/core"
import { useCallback, useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { PERSONAL_SERVER_AUTH_SESSION_ID } from "@/config/account-auth"
import { useAuth } from "@/hooks/useAuth"
import { useAppUpdate } from "@/hooks/use-app-update"
import { useLoadConnectedAppsWhenReady } from "@/hooks/use-load-connected-apps-when-ready"
import { usePersonalServer } from "@/hooks/usePersonalServer"
import { useConnectedApps } from "@/hooks/useConnectedApps"
import { ROUTES } from "@/config/routes"
import { openLocalPath, openExternalUrl } from "@/lib/open-resource"
import { getPersonalServerDataPath, getUserDataPath } from "@/lib/tauri-paths"
import type {
  BrowserSession,
  BrowserStatus,
  NodeJsTestResult,
  SettingsSection,
} from "./types"
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
  const { checkForUpdates, lastStatus: appUpdateCheckStatus } = useAppUpdate()
  const personalServer = usePersonalServer()
  const { connectedApps, fetchConnectedApps, removeApp } = useConnectedApps()
  const sectionParam = searchParams.get(SETTINGS_SECTION_PARAM)
  const activeSection = isSettingsSection(sectionParam)
    ? sectionParam
    : DEFAULT_SETTINGS_SECTION
  const [dataPath, setDataPath] = useState<string>("")
  const [personalServerDataPath, setPersonalServerDataPath] =
    useState<string>("")
  const [appVersion, setAppVersion] = useState<string>("")
  const [logPath, setLogPath] = useState<string>("")
  const [nodeTestStatus, setNodeTestStatus] = useState<
    "idle" | "testing" | "success" | "error"
  >("idle")
  const [nodeTestResult, setNodeTestResult] = useState<NodeJsTestResult | null>(
    null
  )
  const [nodeTestError, setNodeTestError] = useState<string | null>(null)
  const [pathsDebug, setPathsDebug] = useState<Record<string, unknown> | null>(
    null
  )
  const [browserStatus, setBrowserStatus] = useState<BrowserStatus | null>(null)
  const [browserSessions, setBrowserSessions] = useState<BrowserSession[]>([])
  const [simulateNoChrome, setSimulateNoChrome] = useState(false)
  const [clearPersonalServerDataStatus, setClearPersonalServerDataStatus] =
    useState<"idle" | "deleting" | "success" | "error">("idle")
  const [clearPersonalServerDataError, setClearPersonalServerDataError] =
    useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadSettings = async () => {
      const [
        dataPathResult,
        personalServerDataPathResult,
        versionResult,
        logPathResult,
      ] = await Promise.allSettled([
        getUserDataPath(),
        getPersonalServerDataPath(),
        getVersion(),
        invoke<string>("get_log_path"),
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

      if (personalServerDataPathResult.status === "fulfilled") {
        setPersonalServerDataPath(personalServerDataPathResult.value)
      } else {
        console.error(
          "Failed to get personal server data path:",
          personalServerDataPathResult.reason
        )
      }

      if (logPathResult.status === "fulfilled") {
        setLogPath(logPathResult.value)
      } else {
        console.error("Failed to get log path:", logPathResult.reason)
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

  const openLogFolder = useCallback(async () => {
    if (!logPath) return
    await invoke("open_folder", { path: logPath })
  }, [logPath])

  const openPersonalServerFolder = useCallback(async () => {
    if (!personalServerDataPath) return
    await openLocalPath(personalServerDataPath)
  }, [personalServerDataPath])

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
      const result = await invoke<Record<string, unknown>>(
        "debug_connector_paths"
      )
      setPathsDebug(result)
    } catch (error) {
      console.error("Debug paths error:", error)
    }
  }, [])

  const clearDebugPaths = useCallback(() => {
    setPathsDebug(null)
  }, [])

  useLoadConnectedAppsWhenReady({
    port: personalServer.port,
    status: personalServer.status,
    devToken: personalServer.devToken,
    fetchConnectedApps,
  })

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
        const result = await invoke<
          BrowserStatus & { needs_download: boolean }
        >("check_browser_available", { simulateNoChrome })
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

  const handleClearSession = useCallback(
    async (connectorId: string) => {
      try {
        await invoke("clear_browser_session", { connectorId })
        await loadBrowserSessions()
      } catch (error) {
        console.error("Failed to clear browser session:", error)
      }
    },
    [loadBrowserSessions]
  )

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

  const handleRevokeApp = useCallback(
    (appId: string) => {
      removeApp(appId, personalServer.port)
    },
    [removeApp, personalServer.port]
  )

  const handleLogout = useCallback(async () => {
    await logout()
    navigate(ROUTES.home)
  }, [logout, navigate])

  const handleSignIn = useCallback(() => {
    const accountUrl =
      import.meta.env.VITE_ACCOUNT_URL || "https://account.vana.org"
    openExternalUrl(accountUrl)
  }, [])

  const handleSignInToStart = useCallback(async () => {
    const accountUrl =
      import.meta.env.VITE_ACCOUNT_URL || "https://account.vana.org"
    const params = new URLSearchParams({
      sessionId: PERSONAL_SERVER_AUTH_SESSION_ID,
      appName: "DataConnect",
    })
    const url = `${accountUrl}/connect?${params.toString()}`
    console.log("[Settings] Opening sign-in URL:", url)
    try {
      await openExternalUrl(url)
    } catch (err) {
      console.error("[Settings] Failed to open URL:", err)
      window.open(url, "_blank")
    }
  }, [])

  const clearPersonalServerData = useCallback(async () => {
    if (clearPersonalServerDataStatus === "deleting") {
      return
    }

    setClearPersonalServerDataStatus("deleting")
    setClearPersonalServerDataError(null)
    try {
      await invoke("clear_personal_server_data")
      await personalServer.stopServer()
      setClearPersonalServerDataStatus("success")
    } catch (error) {
      setClearPersonalServerDataStatus("error")
      setClearPersonalServerDataError(String(error))
    }
  }, [clearPersonalServerDataStatus, personalServer.stopServer])

  const checkAppUpdate = useCallback(() => {
    void checkForUpdates({ ignoreDismissedVersion: true })
  }, [checkForUpdates])

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
    personalServerDataPath,
    appVersion,
    logPath,
    appUpdateCheckStatus,
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
    onOpenPersonalServerFolder: openPersonalServerFolder,
    onOpenLogFolder: openLogFolder,
    onCheckAppUpdate: checkAppUpdate,
    onTestNodeJs: testNodeJs,
    onDebugPaths: debugPaths,
    onClearDebugPaths: clearDebugPaths,
    onCheckBrowserStatus: checkBrowserStatus,
    onSimulateNoChromeChange: setSimulateNoChrome,
    onClearBrowserSession: handleClearSession,
    clearPersonalServerDataStatus,
    clearPersonalServerDataError,
    onClearPersonalServerData: clearPersonalServerData,
    onRevokeApp: handleRevokeApp,
    onLogout: handleLogout,
    onSignIn: handleSignIn,
    onSignInToStart: handleSignInToStart,
  }
}
