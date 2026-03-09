import { useEffect, useRef } from "react"

interface UseLoadConnectedAppsWhenReadyOptions {
  port: number | null
  status: "stopped" | "starting" | "running" | "error"
  devToken?: string | null
  enabled?: boolean
  fetchConnectedApps: (
    port: number | null,
    devToken?: string | null
  ) => Promise<void> | void
}

export function useLoadConnectedAppsWhenReady({
  port,
  status,
  devToken,
  enabled = true,
  fetchConnectedApps,
}: UseLoadConnectedAppsWhenReadyOptions) {
  const lastFetchKeyRef = useRef<string | null>(null)

  useEffect(() => {
    if (!enabled || !port || status !== "running" || !devToken) {
      if (!enabled || !port || status !== "running") {
        lastFetchKeyRef.current = null
      }
      return
    }

    const fetchKey = `${port}:${devToken}`
    if (lastFetchKeyRef.current === fetchKey) return

    lastFetchKeyRef.current = fetchKey
    void fetchConnectedApps(port, devToken)
  }, [devToken, enabled, fetchConnectedApps, port, status])
}
