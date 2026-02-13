import { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { useSelector } from "react-redux"
import { listen } from "@tauri-apps/api/event"
import { useConnector } from "@/hooks/useConnector"
import { useAuth } from "@/hooks/useAuth"
import { usePersonalServer } from "@/hooks/usePersonalServer"
import { fetchServerIdentity } from "@/services/serverRegistration"
import type { RootState } from "@/state/store"
import { USE_TEST_DATA, testConnectedPlatforms } from "@/pages/home/fixtures"

interface ServerRegisteredPayload {
  status: number
  serverId: string | null
}

const IMPORTS_SOURCE_FILTER_PARAM = "source"
const IMPORTS_SOURCE_FILTER_ALL = "all"

export interface ImportSourceFilterOption {
  value: string
  label: string
}

export function useImportsSection() {
  const [searchParams, setSearchParams] = useSearchParams()
  const runs = useSelector((state: RootState) => state.app.runs)
  const platforms = useSelector((state: RootState) => state.app.platforms)
  const connectedPlatforms = useSelector(
    (state: RootState) => state.app.connectedPlatforms
  )
  const { stopExport } = useConnector()
  const { isAuthenticated } = useAuth()
  const personalServer = usePersonalServer()
  const [serverId, setServerId] = useState<string | null>(null)
  // Bumped when the HTTP server is actually ready (not just spawned)
  const [readyTick, setReadyTick] = useState(0)

  // Listen for server-registered event from auth flow
  // and personal-server-ready (HTTP server actually listening)
  useEffect(() => {
    const unlisteners: (() => void)[] = []

    listen<ServerRegisteredPayload>("server-registered", (event) => {
      if (event.payload.serverId) {
        setServerId(event.payload.serverId)
      }
    }).then((fn) => unlisteners.push(fn))

    listen<{ port: number }>("personal-server-ready", () => {
      setReadyTick((t) => t + 1)
    }).then((fn) => unlisteners.push(fn))

    return () => {
      unlisteners.forEach((fn) => fn())
    }
  }, [])

  // Fetch serverId from health endpoint when server is running and ready
  useEffect(() => {
    if (personalServer.status === "running" && personalServer.port && !serverId) {
      fetchServerIdentity(personalServer.port)
        .then(identity => {
          if (identity.serverId) setServerId(identity.serverId)
        })
        .catch(() => {})
    } else if (personalServer.status !== "running") {
      setServerId(null)
    }
  }, [personalServer.status, personalServer.port, serverId, readyTick])

  const serverReady = personalServer.status === "running" && !!serverId

  const sourceFilterOptions = useMemo<ImportSourceFilterOption[]>(() => {
    const connectedSources =
      USE_TEST_DATA && platforms.length === 0
        ? testConnectedPlatforms
        : platforms.filter(platform => connectedPlatforms[platform.id])

    return [
      { value: IMPORTS_SOURCE_FILTER_ALL, label: "All" },
      ...connectedSources.map(platform => ({
        value: platform.id,
        label: platform.name,
      })),
    ]
  }, [connectedPlatforms, platforms])

  const connectedSourceIdSet = useMemo(
    () => new Set(sourceFilterOptions.slice(1).map(option => option.value)),
    [sourceFilterOptions]
  )

  const selectedSourceFilter = useMemo(() => {
    const sourceFromSearch = searchParams.get(IMPORTS_SOURCE_FILTER_PARAM)
    if (!sourceFromSearch || sourceFromSearch === IMPORTS_SOURCE_FILTER_ALL) {
      return IMPORTS_SOURCE_FILTER_ALL
    }
    return connectedSourceIdSet.has(sourceFromSearch)
      ? sourceFromSearch
      : IMPORTS_SOURCE_FILTER_ALL
  }, [connectedSourceIdSet, searchParams])

  const setSourceFilter = useCallback(
    (nextSourceFilter: string) => {
      const nextParams = new URLSearchParams(searchParams)
      if (
        nextSourceFilter === IMPORTS_SOURCE_FILTER_ALL ||
        !connectedSourceIdSet.has(nextSourceFilter)
      ) {
        nextParams.delete(IMPORTS_SOURCE_FILTER_PARAM)
      } else {
        nextParams.set(IMPORTS_SOURCE_FILTER_PARAM, nextSourceFilter)
      }
      setSearchParams(nextParams, { replace: true })
    },
    [connectedSourceIdSet, searchParams, setSearchParams]
  )

  const filteredRuns = useMemo(() => {
    if (selectedSourceFilter === IMPORTS_SOURCE_FILTER_ALL) {
      return runs
    }
    return runs.filter(run => run.platformId === selectedSourceFilter)
  }, [runs, selectedSourceFilter])

  const activeImports = useMemo(() => {
    return [...filteredRuns]
      .filter(run => run.status === "running" || run.status === "pending")
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
  }, [filteredRuns])

  const finishedImports = useMemo(() => {
    return [...filteredRuns]
      .filter(run => run.status !== "running" && run.status !== "pending")
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
  }, [filteredRuns])

  return {
    activeImports,
    finishedImports,
    sourceFilterOptions,
    selectedSourceFilter,
    setSourceFilter,
    stopExport,
    isAuthenticated,
    personalServer,
    serverId,
    serverReady,
  }
}
