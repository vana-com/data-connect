import { getVersion } from "@tauri-apps/api/app"
import { invoke } from "@tauri-apps/api/core"
import { useCallback, useEffect, useState, useSyncExternalStore } from "react"
import { useNavigate } from "react-router"
import { useAuth } from "@/hooks/useAuth"
import { usePersonalServer } from "@/hooks/usePersonalServer"
import { ROUTES } from "@/config/routes"
import {
  getAllConnectedApps,
  removeConnectedApp,
  subscribeConnectedApps,
} from "@/lib/storage"
import type { BrowserStatus, NodeJsTestResult, SettingsSection } from "./types"

export function useSettingsPage() {
  const navigate = useNavigate()
  const { user, logout, isAuthenticated, walletAddress } = useAuth()
  const personalServer = usePersonalServer()
  const connectedApps = useSyncExternalStore(subscribeConnectedApps, getAllConnectedApps)
  const [activeSection, setActiveSection] = useState<SettingsSection>("account")
  const [dataPath, setDataPath] = useState<string>("")
  const [appVersion, setAppVersion] = useState<string>("")
  const [nodeTestStatus, setNodeTestStatus] = useState<
    "idle" | "testing" | "success" | "error"
  >("idle")
  const [nodeTestResult, setNodeTestResult] = useState<NodeJsTestResult | null>(null)
  const [nodeTestError, setNodeTestError] = useState<string | null>(null)
  const [pathsDebug, setPathsDebug] = useState<Record<string, unknown> | null>(null)
  const [browserStatus, setBrowserStatus] = useState<BrowserStatus | null>(null)
  const [simulateNoChrome, setSimulateNoChrome] = useState<boolean>(() => {
    return localStorage.getItem("databridge_simulate_no_chrome") === "true"
  })

  useEffect(() => {
    let cancelled = false

    const loadSettings = async () => {
      const [dataPathResult, versionResult] = await Promise.allSettled([
        invoke<string>("get_user_data_path"),
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
    try {
      await invoke("open_folder", { path: dataPath })
    } catch (error) {
      console.error("Failed to open folder:", error)
    }
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

  // Persist simulateNoChrome to localStorage
  useEffect(() => {
    localStorage.setItem("databridge_simulate_no_chrome", String(simulateNoChrome))
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
    removeConnectedApp(appId)
  }, [])

  const handleLogout = useCallback(async () => {
    await logout()
    navigate(ROUTES.home)
  }, [logout, navigate])

  const handleSignIn = useCallback(() => {
    navigate(ROUTES.login)
  }, [navigate])

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
    onRevokeApp: handleRevokeApp,
    onLogout: handleLogout,
    onSignIn: handleSignIn,
  }
}
