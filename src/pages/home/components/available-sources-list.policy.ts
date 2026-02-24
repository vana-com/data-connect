import type { Run } from "@/types"

export function getConnectingStatusLine(
  statusMessage: string | undefined,
  phaseLabel: string | undefined
): string {
  // Keep this logic in sync with:
  // docs/260222-home-connectors-info-message-matrix.md
  const normalizedPhaseLabel = phaseLabel?.trim()
  if (normalizedPhaseLabel) return normalizedPhaseLabel
  if (!statusMessage) return "Opening browser…"

  const normalizedStatus = statusMessage.trim().toLowerCase()
  if (
    normalizedStatus === "waiting for sign in..." ||
    normalizedStatus === "waiting for sign in…"
  ) {
    return "Waiting for sign-in…"
  }
  if (
    normalizedStatus === "collecting data..." ||
    normalizedStatus === "collecting data…"
  ) {
    return "Importing data…"
  }

  return statusMessage
}

export function getConnectingAccountLine(run: Run | undefined): string | undefined {
  // Follow-up target: plumb active account identity from connector-data events into
  // Run while the connector is running, so we are not relying on message text.
  const exportEmail = run?.exportData?.userInfo?.email?.trim()
  if (exportEmail) return `Using ${exportEmail}`

  const statusMessage = run?.statusMessage
  if (!statusMessage) return undefined
  const emailMatch = statusMessage.match(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
  )
  if (!emailMatch) return undefined

  return `Using ${emailMatch[0]}`
}

export function isBlockingStatusLine(statusLine: string): boolean {
  const normalized = statusLine.trim().toLowerCase()
  return (
    normalized.startsWith("opening browser") ||
    normalized.startsWith("waiting for sign") ||
    normalized.startsWith("waiting for login") ||
    normalized.startsWith("waiting for user")
  )
}

export function isBlockingRun(run: Run): boolean {
  if (run.status !== "running") return false
  if (run.isConnected) return false

  const statusLine = getConnectingStatusLine(run.statusMessage, run.phase?.label)
  return isBlockingStatusLine(statusLine)
}
