import { useEffect, useMemo, useState } from "react"
import { useSelector } from "react-redux"
import { listen } from "@tauri-apps/api/event"
import { useConnector } from "../../hooks/useConnector"
import { useAuth } from "../../hooks/useAuth"
import { usePersonalServer } from "../../hooks/usePersonalServer"
import { fetchServerIdentity } from "../../services/serverRegistration"
import type { RootState } from "../../state/store"

interface ServerRegisteredPayload {
  status: number
  serverId: string | null
}

export function useRunsPage() {
  const runs = useSelector((state: RootState) => state.app.runs)
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

  const activeRuns = useMemo(() => {
    return [...runs]
      .filter(run => run.status === "running" || run.status === "pending")
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
  }, [runs])

  const finishedRuns = useMemo(() => {
    return [...runs]
      .filter(run => run.status !== "running" && run.status !== "pending")
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
  }, [runs])

  return {
    activeRuns,
    finishedRuns,
    stopExport,
    isAuthenticated,
    personalServer,
    serverId,
    serverReady,
  }
}
