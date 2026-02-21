import { formatShortWeekdayMonthTime } from "@/lib/date-format"
import type { Run } from "@/types"

export const finishedImportStatusBadgeClasses = {
  running: ["border-accent/25", "text-accent"],
  success: ["border-ring", "text-foreground-dim"],
  error: ["border-destructive/70", "text-destructive-foreground"],
  stopped: ["border-amber-600/70", "text-amber-600"],
  default: ["border-border", "text-foreground-dim"],
} as const

export function getStatusLabel(status: Run["status"]) {
  switch (status) {
    case "success":
      return "Completed"
    case "error":
      return "Failed"
    case "stopped":
      return "Stopped"
    default:
      return status
  }
}

export function getRowDescription(run: Run) {
  const startedAt = formatShortWeekdayMonthTime(run.startDate)

  if (run.status === "running" || run.status === "pending") {
    if (run.phase && run.phase.total > 0) {
      return `Started ${startedAt} · Step ${run.phase.step} of ${run.phase.total}`
    }
    return `Started ${startedAt}`
  }

  const finishedAt = run.endDate
    ? formatShortWeekdayMonthTime(run.endDate)
    : formatShortWeekdayMonthTime(run.startDate)

  if (run.status === "success") {
    const exportCount =
      run.itemsExported != null
        ? `${run.itemsExported} ${run.itemLabel || "items"}`
        : "No item count"
    return `${finishedAt} · ${exportCount}`
  }

  if (run.status === "error") {
    return `${finishedAt} · ${run.statusMessage || "Export failed"}`
  }

  if (run.status === "stopped") {
    return `${finishedAt} · Stopped before completion`
  }

  return finishedAt
}

export function getErrorDetail(run: Run) {
  if (run.status !== "error") return null

  const statusMessage = run.statusMessage?.trim()
  if (statusMessage) return statusMessage

  const logLines =
    run.logs
      ?.split("\n")
      .map(line => line.trim())
      .filter(Boolean) ?? []

  if (logLines.length > 0) return logLines[logLines.length - 1]
  return "No failure details were captured for this run."
}

export function shouldConfirmStop(run: Run) {
  if (run.status !== "running") return false
  const hasAdvancedPhase = (run.phase?.step ?? 0) > 1
  const hasCollectedItems = (run.itemCount ?? 0) > 0
  return hasAdvancedPhase || hasCollectedItems
}
