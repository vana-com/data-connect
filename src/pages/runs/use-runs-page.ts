import { useEffect, useMemo, useState } from "react"
import { useSelector } from "react-redux"
import { useConnector } from "../../hooks/useConnector"
import { useAuth } from "../../hooks/useAuth"
import { usePersonalServer } from "../../hooks/usePersonalServer"
import { fetchServerIdentity } from "../../services/serverRegistration"
import type { RootState } from "../../state/store"

export function useRunsPage() {
  const runs = useSelector((state: RootState) => state.app.runs)
  const { stopExport } = useConnector()
  const { isAuthenticated } = useAuth()
  const personalServer = usePersonalServer()
  const [serverId, setServerId] = useState<string | null>(null)

  useEffect(() => {
    if (personalServer.status === "running" && personalServer.port) {
      fetchServerIdentity(personalServer.port)
        .then(identity => setServerId(identity.serverId))
        .catch(() => {})
    } else {
      setServerId(null)
    }
  }, [personalServer.status, personalServer.port])

  const serverReady = personalServer.status === "running" && !!serverId

  const finishedRuns = useMemo(() => {
    return [...runs]
      .filter(run => run.status !== "running" && run.status !== "pending")
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
  }, [runs])

  return {
    finishedRuns,
    stopExport,
    isAuthenticated,
    personalServer,
    serverId,
    serverReady,
  }
}
