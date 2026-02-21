import { getPlatformIngestScope } from "@/lib/platform/utils"

const METADATA_KEYS = ["exportSummary", "timestamp", "version", "platform"]

export function getScopeForPlatform(platformId: string): string | null {
  return getPlatformIngestScope(platformId)
}

/** Extract scoped keys from data (keys containing a dot, excluding metadata). */
export function extractScopeKeys(data: Record<string, unknown>): string[] {
  return Object.keys(data).filter(
    (key) => key.includes(".") && !METADATA_KEYS.includes(key)
  )
}

export async function ingestData(
  port: number,
  scope: string,
  data: object
): Promise<void> {
  const { fetch: tauriFetch } = await import("@tauri-apps/plugin-http")
  const res = await tauriFetch(`http://localhost:${port}/v1/data/${scope}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Ingest failed: ${res.status}`)
}

/**
 * Ingest export data to personal server, detecting per-scope keys automatically.
 * Falls back to single-scope ingest for old-format connectors.
 */
export async function ingestExportData(
  port: number,
  platformId: string,
  data: Record<string, unknown>
): Promise<string[]> {
  const scopeKeys = extractScopeKeys(data)

  if (scopeKeys.length > 0) {
    const ingested: string[] = []
    for (const scope of scopeKeys) {
      try {
        await ingestData(port, scope, data[scope] as object)
        ingested.push(scope)
      } catch (err) {
        console.error(`[ingest] Failed to ingest scope ${scope}:`, err)
      }
    }
    return ingested
  }

  // Fallback for old-format connectors (single blob)
  const scope = getScopeForPlatform(platformId)
  if (scope) {
    await ingestData(port, scope, data as object)
    return [scope]
  }
  return []
}
