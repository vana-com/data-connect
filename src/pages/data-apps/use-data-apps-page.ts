import { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import {
  isAllowedSubmittedAppExternalUrl,
  openSubmittedAppExternalUrl,
} from "@/apps/external-url"
import { useConnectedApps } from "@/hooks/useConnectedApps"
import { useLoadConnectedAppsWhenReady } from "@/hooks/use-load-connected-apps-when-ready"
import { usePersonalServer } from "@/hooks/usePersonalServer"
import {
  getConnectedAppsUiDebugScenario,
  isConnectedAppsUiDebugEnabled,
  resolveConnectedAppsUiDebugApps,
} from "./connected-apps-ui-debug"
import type { ConnectedApp } from "@/types"

export type DataAppsTab = "discover" | "connected"

function isDataAppsTab(value: string | null): value is DataAppsTab {
  return value === "discover" || value === "connected"
}

export function useDataAppsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { connectedApps, fetchConnectedApps } = useConnectedApps()
  const personalServer = usePersonalServer()
  const [enableTabMotion, setEnableTabMotion] = useState(false)
  const [isConnectedAppsLoading, setIsConnectedAppsLoading] = useState(false)
  const [lastConnectedAppsFetchKey, setLastConnectedAppsFetchKey] = useState<
    string | null
  >(null)
  const search = useMemo(() => {
    const value = searchParams.toString()
    return value ? `?${value}` : ""
  }, [searchParams])
  const rawTab = searchParams.get("tab")
  const activeTab = useMemo<DataAppsTab>(() => {
    return isDataAppsTab(rawTab) ? rawTab : "discover"
  }, [rawTab])

  const currentConnectedAppsUiDebugScenario = useMemo(
    () => getConnectedAppsUiDebugScenario(search),
    [search]
  )
  const connectedAppsUiDebugEnabled = useMemo(
    () => isConnectedAppsUiDebugEnabled(search),
    [search]
  )
  const effectiveConnectedApps = useMemo(
    () => resolveConnectedAppsUiDebugApps({ apps: connectedApps, search }),
    [connectedApps, search]
  )
  const isConnectedAppsDebugLoading =
    currentConnectedAppsUiDebugScenario === "loading"
  const connectedAppsFetchKey =
    personalServer.port && personalServer.devToken
      ? `${personalServer.port}:${personalServer.devToken}`
      : null
  const shouldFetchConnectedApps =
    activeTab === "connected" &&
    !connectedAppsUiDebugEnabled &&
    connectedAppsFetchKey !== null &&
    lastConnectedAppsFetchKey !== connectedAppsFetchKey

  const fetchConnectedAppsForPage = useCallback(
    async (port: number | null, devToken?: string | null) => {
      try {
        await fetchConnectedApps(port, devToken)
      } finally {
        if (port && devToken) {
          setLastConnectedAppsFetchKey(`${port}:${devToken}`)
        }
        setIsConnectedAppsLoading(false)
      }
    },
    [fetchConnectedApps]
  )

  useLoadConnectedAppsWhenReady({
    port: personalServer.port,
    status: personalServer.status,
    devToken: personalServer.devToken,
    enabled: shouldFetchConnectedApps,
    fetchConnectedApps: fetchConnectedAppsForPage,
  })

  useEffect(() => {
    if (shouldFetchConnectedApps && connectedApps.length === 0) {
      setIsConnectedAppsLoading(true)
    }
  }, [connectedApps.length, shouldFetchConnectedApps])

  useEffect(() => {
    if (!rawTab || isDataAppsTab(rawTab)) return

    const nextSearchParams = new URLSearchParams(searchParams)
    nextSearchParams.delete("tab")
    setSearchParams(nextSearchParams, { replace: true })
  }, [rawTab, searchParams, setSearchParams])

  useEffect(() => {
    const frame = requestAnimationFrame(() => setEnableTabMotion(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  const setActiveTab = useCallback(
    (nextTab: DataAppsTab) => {
      if (nextTab === activeTab) return

      const nextSearchParams = new URLSearchParams(searchParams)
      if (nextTab === "discover") {
        nextSearchParams.delete("tab")
      } else {
        nextSearchParams.set("tab", nextTab)
        if (
          !connectedAppsUiDebugEnabled &&
          connectedApps.length === 0 &&
          connectedAppsFetchKey !== null &&
          lastConnectedAppsFetchKey !== connectedAppsFetchKey
        ) {
          setIsConnectedAppsLoading(true)
        }
      }
      setSearchParams(nextSearchParams, { replace: true })
    },
    [
      activeTab,
      connectedApps.length,
      connectedAppsFetchKey,
      connectedAppsUiDebugEnabled,
      lastConnectedAppsFetchKey,
      searchParams,
      setSearchParams,
    ]
  )

  const setConnectedAppsUiDebugScenario = useCallback(
    (scenario: string | null) => {
      const nextSearchParams = new URLSearchParams(searchParams)
      if (scenario) nextSearchParams.set("connectedAppsScenario", scenario)
      else nextSearchParams.delete("connectedAppsScenario")
      setSearchParams(nextSearchParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const openConnectedApp = useCallback((app: ConnectedApp) => {
    if (!app.externalUrl || !isAllowedSubmittedAppExternalUrl(app.externalUrl)) {
      return
    }
    void openSubmittedAppExternalUrl(app.externalUrl)
  }, [])

  const canOpenConnectedApp = useCallback(
    (app: ConnectedApp) =>
      Boolean(
        app.externalUrl &&
          isAllowedSubmittedAppExternalUrl(app.externalUrl)
      ),
    []
  )

  return {
    activeTab,
    connectedApps: effectiveConnectedApps,
    canOpenConnectedApp,
    connectedAppsUiDebugEnabled,
    currentConnectedAppsUiDebugScenario,
    enableTabMotion,
    isConnectedAppsLoading: isConnectedAppsLoading || isConnectedAppsDebugLoading,
    openConnectedApp,
    setConnectedAppsUiDebugScenario,
    setActiveTab,
  }
}
