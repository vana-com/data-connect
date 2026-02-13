import type { Run } from "@/types"

export type IngestStatus = "idle" | "sending" | "sent" | "error"

export const getIngestButtonLabel = (status: IngestStatus) =>
  status === "sent" ? "Synced" : status === "error" ? "Failed" : "Ingest"

export const formatRunDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export const buildExportData = (
  data: Record<string, unknown>,
  run: Run
): Run["exportData"] => {
  let exportedAt = run.startDate
  if (data.timestamp != null) {
    if (typeof data.timestamp === "number") {
      exportedAt = new Date(data.timestamp).toISOString()
    } else if (typeof data.timestamp === "string") {
      const parsed = Date.parse(data.timestamp)
      if (!Number.isNaN(parsed)) {
        exportedAt = new Date(parsed).toISOString()
      }
    }
  }

  const innerData =
    typeof data.data === "object" && data.data !== null
      ? (data.data as Record<string, unknown>)
      : {}
  const rawConversations = Array.isArray(innerData.conversations)
    ? innerData.conversations
    : []

  return {
    platform: typeof data.platform === "string" ? data.platform : run.platformId,
    company: typeof data.company === "string" ? data.company : run.company,
    exportedAt,
    conversations: rawConversations.map((c: unknown) => {
      if (typeof c !== "object" || c === null) {
        return { id: "", title: "", url: "", scrapedAt: new Date().toISOString() }
      }
      const conv = c as Record<string, unknown>
      const scrapedAt =
        typeof conv.timestamp === "string"
          ? conv.timestamp
          : typeof conv.timestamp === "number"
            ? new Date(conv.timestamp).toISOString()
            : new Date().toISOString()
      return {
        id: typeof conv.id === "string" ? conv.id : "",
        title:
          typeof conv.title === "string"
            ? conv.title
            : typeof conv.name === "string"
              ? conv.name
              : "",
        url: typeof conv.url === "string" ? conv.url : "",
        scrapedAt,
      }
    }),
    totalConversations:
      typeof innerData.totalConversations === "number"
        ? innerData.totalConversations
        : undefined,
  }
}
