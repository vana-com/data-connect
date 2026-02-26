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
import { openExternalUrl } from "@/lib/open-resource"

const DISMISSED_VERSION_STORAGE_KEY = "dataconnect_app_update_dismissed_version"
const APP_UPDATE_RECHECK_INTERVAL_MS = 6 * 60 * 60 * 1000
const APP_UPDATE_TOAST_ID = "app-update-toast"

type AppUpdateStatus = AppUpdateDecision["status"] | "idle" | "checking"
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
  const dismissedVersionRef = useRef<string | null>(readDismissedVersion())

  const dismissUpdate = useCallback((remoteVersion: string) => {
    dismissedVersionRef.current = remoteVersion
    writeDismissedVersion(remoteVersion)
    toast.dismiss(APP_UPDATE_TOAST_ID)
  }, [])

  const openUpdate = useCallback((releaseUrl: string) => {
    void openExternalUrl(releaseUrl)
    toast.dismiss(APP_UPDATE_TOAST_ID)
  }, [])

  const showUpdateToast = useCallback(
    (decision: UpdateAvailableDecision) => {
      toast("Update available", {
        id: APP_UPDATE_TOAST_ID,
        description: `Version ${decision.remoteVersion} is ready`,
        duration: Infinity,
        action: {
          label: "Update now",
          onClick: () => {
            openUpdate(decision.releaseUrl)
          },
        },
        cancel: {
          label: "Later",
          onClick: () => {
            dismissUpdate(decision.remoteVersion)
          },
        },
      })
    },
    [dismissUpdate, openUpdate]
  )

  const applyDecision = useCallback(
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

      showUpdateToast(decision)
    },
    [showUpdateToast]
  )

  const checkForUpdates = useCallback(
    async (options: { ignoreDismissedVersion?: boolean } = {}) => {
      if (inFlightRef.current) return

      const debugDecision = resolveAppUpdateUiDebugDecision(window.location.search)
      if (debugDecision) {
        applyDecision(debugDecision, options)
        return
      }

      inFlightRef.current = true
      setIsChecking(true)
      setLastStatus("checking")
      try {
        const decision = await checkAppUpdate()
        applyDecision(decision, options)
      } catch {
        setLastStatus("unknown")
      } finally {
        inFlightRef.current = false
        setIsChecking(false)
      }
    },
    [applyDecision]
  )

  useEffect(() => {
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
