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
  checkAppUpdate,
  type AppUpdateDecision,
} from "@/hooks/app-update/check-app-update"
import {
  isAppUpdateUiDebugEnabled,
  resolveAppUpdateUiDebugDecision,
} from "@/hooks/app-update/app-update-ui-debug"
import {
  checkForTauriAppUpdate,
  isTauriMacOsRuntime,
  type TauriAppUpdate,
} from "@/hooks/app-update/tauri-updater"
import { openExternalUrl } from "@/lib/open-resource"

const DISMISSED_VERSION_STORAGE_KEY = "dataconnect_app_update_dismissed_version"
const APP_UPDATE_RECHECK_INTERVAL_MS = 6 * 60 * 60 * 1000
const APP_UPDATE_STARTUP_SETTLE_MS = import.meta.env.TEST ? 0 : 15_000
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
  checkForUpdates: (options?: {
    ignoreDismissedVersion?: boolean
  }) => Promise<void>
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
  const dismissedVersionRef = useRef<string | null>(readDismissedVersion())
  const dismissedStagedVersionRef = useRef<string | null>(null)
  const stagedUpdateRef = useRef<TauriAppUpdate | null>(null)

  const clearStagedUpdate = useCallback(async () => {
    const current = stagedUpdateRef.current
    stagedUpdateRef.current = null
    if (!current) return

    try {
      await current.close()
    } catch (error) {
      console.error("[AppUpdate] Failed to close staged updater handle:", error)
    }
  }, [])

  const dismissFallbackUpdate = useCallback((remoteVersion: string) => {
    dismissedVersionRef.current = remoteVersion
    writeDismissedVersion(remoteVersion)
    toast.dismiss(APP_UPDATE_TOAST_ID)
  }, [])

  const dismissStagedUpdate = useCallback((remoteVersion: string) => {
    dismissedStagedVersionRef.current = remoteVersion
    toast.dismiss(APP_UPDATE_TOAST_ID)
  }, [])

  const openFallbackUpdate = useCallback((releaseUrl: string) => {
    void openExternalUrl(releaseUrl)
    toast.dismiss(APP_UPDATE_TOAST_ID)
  }, [])

  const installStagedUpdate = useCallback(async (remoteVersion: string) => {
    const stagedUpdate = stagedUpdateRef.current
    if (!stagedUpdate || stagedUpdate.version !== remoteVersion) return

    try {
      await stagedUpdate.installAndRelaunch()
    } catch (error) {
      console.error("[AppUpdate] Failed to install staged update:", error)
      setLastStatus("unknown")
    }
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

  const showRestartToast = useCallback(
    (update: TauriAppUpdate) => {
      toast("Restart to update", {
        id: APP_UPDATE_TOAST_ID,
        description: `Version ${update.version} is ready`,
        duration: Infinity,
        action: {
          label: "Restart now",
          onClick: () => {
            void installStagedUpdate(update.version)
          },
        },
        cancel: {
          label: "Later",
          onClick: () => {
            dismissStagedUpdate(update.version)
          },
        },
      })
    },
    [dismissStagedUpdate, installStagedUpdate]
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
        dismissedVersionRef.current === decision.remoteVersion
      ) {
        toast.dismiss(APP_UPDATE_TOAST_ID)
        return
      }

      if (
        dismissedVersionRef.current &&
        dismissedVersionRef.current !== decision.remoteVersion
      ) {
        dismissedVersionRef.current = null
        writeDismissedVersion(null)
      }

      showFallbackUpdateToast(decision)
    },
    [showFallbackUpdateToast]
  )

  const applyStagedUpdate = useCallback(
    async (
      nextUpdate: TauriAppUpdate | null,
      options: { ignoreDismissedVersion?: boolean } = {}
    ) => {
      if (!nextUpdate) {
        dismissedStagedVersionRef.current = null
        await clearStagedUpdate()
        setLastStatus("upToDate")
        toast.dismiss(APP_UPDATE_TOAST_ID)
        return
      }

      const currentStagedUpdate = stagedUpdateRef.current
      if (
        currentStagedUpdate &&
        currentStagedUpdate.version === nextUpdate.version
      ) {
        await nextUpdate.close()
        setLastStatus("restartReady")

        if (
          !options.ignoreDismissedVersion &&
          dismissedStagedVersionRef.current === currentStagedUpdate.version
        ) {
          toast.dismiss(APP_UPDATE_TOAST_ID)
          return
        }

        showRestartToast(currentStagedUpdate)
        return
      }

      if (
        dismissedStagedVersionRef.current &&
        dismissedStagedVersionRef.current !== nextUpdate.version
      ) {
        dismissedStagedVersionRef.current = null
      }

      await clearStagedUpdate()
      stagedUpdateRef.current = nextUpdate

      setLastStatus("downloading")
      try {
        await nextUpdate.download()
      } catch (error) {
        console.error("[AppUpdate] Failed to download update:", error)
        await clearStagedUpdate()
        setLastStatus("unknown")
        return
      }

      setLastStatus("restartReady")

      if (
        !options.ignoreDismissedVersion &&
        dismissedStagedVersionRef.current === nextUpdate.version
      ) {
        toast.dismiss(APP_UPDATE_TOAST_ID)
        return
      }

      showRestartToast(nextUpdate)
    },
    [clearStagedUpdate, showRestartToast]
  )

  const checkForUpdates = useCallback(
    async (options: { ignoreDismissedVersion?: boolean } = {}) => {
      if (inFlightRef.current) return

      const debugDecision = resolveAppUpdateUiDebugDecision(location.search)
      if (debugDecision) {
        await clearStagedUpdate()
        applyFallbackDecision(debugDecision, options)
        return
      }

      inFlightRef.current = true
      setIsChecking(true)
      setLastStatus("checking")

      try {
        if (isTauriMacOsRuntime()) {
          const update = await checkForTauriAppUpdate()
          await applyStagedUpdate(update, options)
        } else {
          const decision = await checkAppUpdate()
          applyFallbackDecision(decision, options)
        }
      } catch (error) {
        console.error("[AppUpdate] Failed to check for updates:", error)
        setLastStatus("unknown")
      } finally {
        inFlightRef.current = false
        setIsChecking(false)
      }
    },
    [
      applyFallbackDecision,
      applyStagedUpdate,
      clearStagedUpdate,
      location.search,
    ]
  )

  useEffect(() => {
    if (isAppUpdateUiDebugEnabled(location.search)) {
      void checkForUpdates()
      return
    }

    const timeoutId = window.setTimeout(() => {
      void checkForUpdates()
    }, APP_UPDATE_STARTUP_SETTLE_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [checkForUpdates, location.search])

  useEffect(() => {
    if (!hasSeenInitialSearchEffectRef.current) {
      hasSeenInitialSearchEffectRef.current = true
      return
    }
    if (!isAppUpdateUiDebugEnabled(location.search)) return
    void checkForUpdates()
  }, [checkForUpdates, location.search])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void checkForUpdates()
    }, APP_UPDATE_RECHECK_INTERVAL_MS)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [checkForUpdates])

  useEffect(() => {
    return () => {
      void clearStagedUpdate()
    }
  }, [clearStagedUpdate])

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
