import { useEffect, useState } from "react"

interface PersonalServerLike {
  status: string
  port: number | null
  tunnelUrl: string | null
  error: string | null
  restartingRef: { current: boolean }
}

interface UsePersonalServerReadinessGateInput {
  active: boolean
  isDemoSession: boolean
  personalServer: PersonalServerLike
  timeoutMs?: number
}

type ReadinessStatus = "idle" | "waiting" | "ready" | "error"

interface ReadinessGateState {
  status: ReadinessStatus
  error?: string
}

const TUNNEL_TIMEOUT_ERROR =
  "Could not establish a public tunnel for the Personal Server. The requesting app won't be able to access your data."

export function usePersonalServerReadinessGate({
  active,
  isDemoSession,
  personalServer,
  timeoutMs = 90_000,
}: UsePersonalServerReadinessGateInput): ReadinessGateState {
  const [timedOut, setTimedOut] = useState(false)

  const waitingForServer =
    active &&
    !isDemoSession &&
    personalServer.status !== "error" &&
    (personalServer.restartingRef.current ||
      !personalServer.port ||
      !personalServer.tunnelUrl)

  useEffect(() => {
    if (!waitingForServer) {
      setTimedOut(false)
      return
    }
    const timeout = setTimeout(() => {
      setTimedOut(true)
    }, timeoutMs)
    return () => {
      clearTimeout(timeout)
    }
  }, [timeoutMs, waitingForServer])

  if (!active) {
    return { status: "idle" }
  }

  if (personalServer.status === "error") {
    return {
      status: "error",
      error: personalServer.error || "Personal Server failed to start.",
    }
  }

  if (isDemoSession) {
    return { status: "ready" }
  }

  if (timedOut) {
    return { status: "error", error: TUNNEL_TIMEOUT_ERROR }
  }

  if (waitingForServer) {
    return { status: "waiting" }
  }

  return { status: "ready" }
}
