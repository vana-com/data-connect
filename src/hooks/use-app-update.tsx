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
  checkForTauriUpdate,
  downloadTauriUpdate,
  installTauriUpdate,
  isMacOsTauriUpdaterRuntime,
  relaunchTauriApp,
  type TauriUpdaterHandle,
} from "@/hooks/app-update/tauri-updater"
import { openExternalUrl } from "@/lib/open-resource"

const DISMISSED_VERSION_STORAGE_KEY = "dataconnect_app_update_dismissed_version"
const APP_UPDATE_TOAST_ID = "app-update-toast"
export const APP_UPDATE_STARTUP_SETTLE_DELAY_MS = 5 * 1000
export const APP_UPDATE_RECHECK_INTERVAL_MS = 6 * 60 * 60 * 1000

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
interface StagedMacUpdate {
  remoteVersion: string
  update: TauriUpdaterHandle
}

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
  const dismissedVersionRef = useRef<string | null>(readDismissedVersion())
  const dismissedStagedVersionRef = useRef<string | null>(null)
  const stagedMacUpdateRef = useRef<StagedMacUpdate | null>(null)

  const dismissFallbackUpdate = useCallback((remoteVersion: string) => {
    dismissedVersionRef.current = remoteVersion
    writeDismissedVersion(remoteVersion)
    toast.dismiss(APP_UPDATE_TOAST_ID)
  }, [])

  const dismissStagedMacUpdate = useCallback((remoteVersion: string) => {
    dismissedStagedVersionRef.current = remoteVersion
    toast.dismiss(APP_UPDATE_TOAST_ID)
  }, [])

  const openFallbackUpdate = useCallback((releaseUrl: string) => {
    void openExternalUrl(releaseUrl)
    toast.dismiss(APP_UPDATE_TOAST_ID)
  }, [])

  const restartToUpdate = useCallback(async () => {
    const stagedUpdate = stagedMacUpdateRef.current
    if (!stagedUpdate) return

    try {
      await installTauriUpdate(stagedUpdate.update)
      await relaunchTauriApp()
    } catch {
      setLastStatus("unknown")
      toast.dismiss(APP_UPDATE_TOAST_ID)
    }
  }, [])

  const showRestartToast = useCallback(
    (remoteVersion: string) => {
      toast("Restart to update", {
        id: APP_UPDATE_TOAST_ID,
        description: `Version ${remoteVersion} is ready`,
        duration: Infinity,
        action: {
          label: "Restart now",
          onClick: () => {
            void restartToUpdate()
          },
        },
        cancel: {
          label: "Later",
          onClick: () => {
            dismissStagedMacUpdate(remoteVersion)
          },
        },
      })
    },
    [dismissStagedMacUpdate, restartToUpdate]
  )

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

  const applyMacRestartReadyState = useCallback(
    (
      stagedUpdate: StagedMacUpdate,
      options: { ignoreDismissedVersion?: boolean } = {}
    ) => {
      setLastStatus("restartReady")

      if (
        !options.ignoreDismissedVersion &&
        dismissedStagedVersionRef.current === stagedUpdate.remoteVersion
      ) {
        toast.dismiss(APP_UPDATE_TOAST_ID)
        return
      }

      if (
        dismissedStagedVersionRef.current &&
        dismissedStagedVersionRef.current !== stagedUpdate.remoteVersion
      ) {
        dismissedStagedVersionRef.current = null
      }

      showRestartToast(stagedUpdate.remoteVersion)
    },
    [showRestartToast]
  )

  const checkForMacOsTauriUpdates = useCallback(
    async (options: { ignoreDismissedVersion?: boolean } = {}) => {
      const stagedUpdate = stagedMacUpdateRef.current
      if (stagedUpdate) {
        applyMacRestartReadyState(stagedUpdate, options)
        return
      }

      const availableUpdate = await checkForTauriUpdate()
      if (!availableUpdate) {
        setLastStatus("upToDate")
        toast.dismiss(APP_UPDATE_TOAST_ID)
        return
      }

      setLastStatus("downloading")
      await downloadTauriUpdate(availableUpdate)

      const nextStagedUpdate = {
        remoteVersion: availableUpdate.version,
        update: availableUpdate,
      }
      stagedMacUpdateRef.current = nextStagedUpdate
      applyMacRestartReadyState(nextStagedUpdate, options)
    },
    [applyMacRestartReadyState]
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
        if (isMacOsTauriUpdaterRuntime()) {
          await checkForMacOsTauriUpdates(options)
        } else {
          const decision = await checkAppUpdate()
          applyFallbackDecision(decision, options)
        }
      } catch {
        setLastStatus("unknown")
      } finally {
        inFlightRef.current = false
        setIsChecking(false)
      }
    },
    [applyFallbackDecision, checkForMacOsTauriUpdates]
  )

  useEffect(() => {
    if (isMacOsTauriUpdaterRuntime()) {
      const timeoutId = window.setTimeout(() => {
        void checkForUpdates()
      }, APP_UPDATE_STARTUP_SETTLE_DELAY_MS)

      return () => {
        window.clearTimeout(timeoutId)
      }
    }

    void checkForUpdates()
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
