import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { useLocation } from "react-router-dom"
import { toast } from "sonner"
import {
  canUseTauriUpdater,
  checkForTauriUpdate,
  clearPendingTauriUpdate,
  downloadTauriUpdate,
  installTauriUpdate,
  relaunchTauriApp,
} from "@/hooks/app-update/tauri-updater"
import {
  checkAppUpdate,
  type AppUpdateDecision,
} from "@/hooks/app-update/check-app-update"
import {
  isAppUpdateUiDebugEnabled,
  resolveAppUpdateUiDebugDecision,
} from "@/hooks/app-update/app-update-ui-debug"
import { openExternalUrl } from "@/lib/open-resource"

const DISMISSED_VERSION_STORAGE_KEY = "dataconnect_app_update_dismissed_version"
const APP_UPDATE_STARTUP_SETTLE_DELAY_MS = 1500
const APP_UPDATE_RECHECK_INTERVAL_MS = 6 * 60 * 60 * 1000
const APP_UPDATE_TOAST_ID = "app-update-toast"

type AppUpdateStatus =
  | AppUpdateDecision["status"]
  | "idle"
  | "checking"
  | "downloading"
  | "restartReady"
type UpdateAvailableDecision = Extract<
  AppUpdateDecision,
  { status: "updateAvailable" }
>

interface AppUpdateContextValue {
  isChecking: boolean
  lastStatus: AppUpdateStatus
  checkForUpdates: (options?: { ignoreDismissedVersion?: boolean }) => Promise<void>
}

const fallbackContextValue: AppUpdateContextValue = {
  isChecking: false,
  lastStatus: "idle",
  checkForUpdates: async () => {},
}

const AppUpdateContext =
  createContext<AppUpdateContextValue>(fallbackContextValue)

function readDismissedVersion(): string | null {
  if (typeof window === "undefined") return null
  try {
    return localStorage.getItem(DISMISSED_VERSION_STORAGE_KEY)
  } catch {
    return null
  }
}

function writeDismissedVersion(version: string | null): void {
  if (typeof window === "undefined") return
  try {
    if (version) {
      localStorage.setItem(DISMISSED_VERSION_STORAGE_KEY, version)
      return
    }
    localStorage.removeItem(DISMISSED_VERSION_STORAGE_KEY)
  } catch {
    // Ignore localStorage failures.
  }
}

export function AppUpdateProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const [isChecking, setIsChecking] = useState(false)
  const [lastStatus, setLastStatus] = useState<AppUpdateStatus>("idle")
  const inFlightRef = useRef(false)
  const hasSeenInitialSearchEffectRef = useRef(false)
  const persistedDismissedVersionRef = useRef<string | null>(
    readDismissedVersion()
  )
  const sessionDismissedVersionRef = useRef<string | null>(null)

  const dismissFallbackUpdate = useCallback((remoteVersion: string) => {
    persistedDismissedVersionRef.current = remoteVersion
    writeDismissedVersion(remoteVersion)
    toast.dismiss(APP_UPDATE_TOAST_ID)
  }, [])

  const dismissRestartReadyUpdate = useCallback((remoteVersion: string) => {
    sessionDismissedVersionRef.current = remoteVersion
    toast.dismiss(APP_UPDATE_TOAST_ID)
  }, [])

  const openFallbackUpdate = useCallback((releaseUrl: string) => {
    void openExternalUrl(releaseUrl)
    toast.dismiss(APP_UPDATE_TOAST_ID)
  }, [])

  const showFallbackUpdateToast = useCallback(
    (decision: UpdateAvailableDecision) => {
      toast("Update available", {
        id: APP_UPDATE_TOAST_ID,
        description: `Version ${decision.remoteVersion} is ready`,
        duration: Infinity,
        action: {
          label: "Update now",
          onClick: () => {
            openFallbackUpdate(decision.releaseUrl)
          },
        },
        cancel: {
          label: "Later",
          onClick: () => {
            dismissFallbackUpdate(decision.remoteVersion)
          },
        },
      })
    },
    [dismissFallbackUpdate, openFallbackUpdate]
  )

  const showRestartReadyToast = useCallback(
    (version: string) => {
      toast("Restart to update", {
        id: APP_UPDATE_TOAST_ID,
        description: `Version ${version} is ready`,
        duration: Infinity,
        action: {
          label: "Restart now",
          onClick: () => {
            void (async () => {
              try {
                const installed = await installTauriUpdate()
                if (!installed) return
                await relaunchTauriApp()
              } catch {
                setLastStatus("unknown")
              }
            })()
          },
        },
        cancel: {
          label: "Later",
          onClick: () => {
            dismissRestartReadyUpdate(version)
          },
        },
      })
    },
    [dismissRestartReadyUpdate]
  )

  const applyFallbackDecision = useCallback(
    (
      decision: AppUpdateDecision,
      options: { ignoreDismissedVersion?: boolean } = {}
    ) => {
      setLastStatus(decision.status)

      if (decision.status !== "updateAvailable") {
        if (decision.status === "upToDate") {
          toast.dismiss(APP_UPDATE_TOAST_ID)
        }
        return
      }

      if (
        !options.ignoreDismissedVersion &&
        persistedDismissedVersionRef.current === decision.remoteVersion
      ) {
        toast.dismiss(APP_UPDATE_TOAST_ID)
        return
      }

      if (
        persistedDismissedVersionRef.current &&
        persistedDismissedVersionRef.current !== decision.remoteVersion
      ) {
        persistedDismissedVersionRef.current = null
        writeDismissedVersion(null)
      }

      showFallbackUpdateToast(decision)
    },
    [showFallbackUpdateToast]
  )

  const checkForUpdates = useCallback(
    async (options: { ignoreDismissedVersion?: boolean } = {}) => {
      if (inFlightRef.current) return

      const debugDecision = resolveAppUpdateUiDebugDecision(window.location.search)
      if (debugDecision) {
        applyFallbackDecision(debugDecision, options)
        return
      }

      inFlightRef.current = true
      setIsChecking(true)
      setLastStatus("checking")
      try {
        if (canUseTauriUpdater()) {
          const update = await checkForTauriUpdate()
          if (!update) {
            toast.dismiss(APP_UPDATE_TOAST_ID)
            setLastStatus("upToDate")
            return
          }

          if (
            !options.ignoreDismissedVersion &&
            sessionDismissedVersionRef.current === update.version
          ) {
            setLastStatus("restartReady")
            return
          }

          if (
            sessionDismissedVersionRef.current &&
            sessionDismissedVersionRef.current !== update.version
          ) {
            sessionDismissedVersionRef.current = null
          }

          setLastStatus("downloading")
          const downloaded = await downloadTauriUpdate()
          if (!downloaded) {
            setLastStatus("unknown")
            return
          }

          setLastStatus("restartReady")
          showRestartReadyToast(update.version)
          return
        }

        const decision = await checkAppUpdate()
        applyFallbackDecision(decision, options)
      } catch {
        void clearPendingTauriUpdate()
        setLastStatus("unknown")
      } finally {
        inFlightRef.current = false
        setIsChecking(false)
      }
    },
    [applyFallbackDecision, showRestartReadyToast]
  )

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void checkForUpdates()
    }, APP_UPDATE_STARTUP_SETTLE_DELAY_MS)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [checkForUpdates])

  useEffect(() => {
    if (!hasSeenInitialSearchEffectRef.current) {
      hasSeenInitialSearchEffectRef.current = true
      return
    }
    if (!isAppUpdateUiDebugEnabled(location.search)) return
    void checkForUpdates()
  }, [checkForUpdates, location.search])

  useEffect(() => {
    const interval = window.setInterval(() => {
      void checkForUpdates()
    }, APP_UPDATE_RECHECK_INTERVAL_MS)
    return () => {
      window.clearInterval(interval)
    }
  }, [checkForUpdates])

  const contextValue = useMemo(
    () => ({
      isChecking,
      lastStatus,
      checkForUpdates,
    }),
    [checkForUpdates, isChecking, lastStatus]
  )

  return (
    <AppUpdateContext.Provider value={contextValue}>
      {children}
    </AppUpdateContext.Provider>
  )
}

export function useAppUpdate() {
  return useContext(AppUpdateContext)
}
