import { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { useSelector } from "react-redux"
import { listen } from "@tauri-apps/api/event"
import { useConnector } from "../../hooks/useConnector"
import { useAuth } from "../../hooks/useAuth"
import { usePersonalServer } from "../../hooks/usePersonalServer"
import { fetchServerIdentity } from "../../services/serverRegistration"
import type { RootState } from "../../state/store"
import { USE_TEST_DATA, testConnectedPlatforms } from "../home/fixtures"

interface ServerRegisteredPayload {
  status: number
  serverId: string | null
}

const RUNS_SOURCE_FILTER_PARAM = "source"
const RUNS_SOURCE_FILTER_ALL = "all"

export interface RunSourceFilterOption {
  value: string
  label: string
}

export function useRunsPage() {
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

    return () => { unlisteners.forEach((fn) => fn()) }
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

  const sourceFilterOptions = useMemo<RunSourceFilterOption[]>(() => {
    const connectedSources =
      USE_TEST_DATA && platforms.length === 0
        ? testConnectedPlatforms
        : platforms.filter(platform => connectedPlatforms[platform.id])

    return [
      { value: RUNS_SOURCE_FILTER_ALL, label: "All" },
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
    const sourceFromSearch = searchParams.get(RUNS_SOURCE_FILTER_PARAM)
    if (!sourceFromSearch || sourceFromSearch === RUNS_SOURCE_FILTER_ALL) {
      return RUNS_SOURCE_FILTER_ALL
    }
    return connectedSourceIdSet.has(sourceFromSearch)
      ? sourceFromSearch
      : RUNS_SOURCE_FILTER_ALL
  }, [connectedSourceIdSet, searchParams])

  const setSourceFilter = useCallback(
    (nextSourceFilter: string) => {
      const nextParams = new URLSearchParams(searchParams)
      if (
        nextSourceFilter === RUNS_SOURCE_FILTER_ALL ||
        !connectedSourceIdSet.has(nextSourceFilter)
      ) {
        nextParams.delete(RUNS_SOURCE_FILTER_PARAM)
      } else {
        nextParams.set(RUNS_SOURCE_FILTER_PARAM, nextSourceFilter)
      }
      setSearchParams(nextParams, { replace: true })
    },
    [connectedSourceIdSet, searchParams, setSearchParams]
  )

  const filteredRuns = useMemo(() => {
    if (selectedSourceFilter === RUNS_SOURCE_FILTER_ALL) {
      return runs
    }
    return runs.filter(run => run.platformId === selectedSourceFilter)
  }, [runs, selectedSourceFilter])

  const activeRuns = useMemo(() => {
    return [...filteredRuns]
      .filter(run => run.status === "running" || run.status === "pending")
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
  }, [filteredRuns])

  const finishedRuns = useMemo(() => {
    return [...filteredRuns]
      .filter(run => run.status !== "running" && run.status !== "pending")
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
  }, [filteredRuns])

  return {
    activeRuns,
    finishedRuns,
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
