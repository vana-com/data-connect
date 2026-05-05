import { getPlatformIngestScope } from "@/lib/platform/utils"

const METADATA_KEYS = ["exportSummary", "timestamp", "version", "platform"]

/**
 * Where to send ingest. Either a local port (Tauri-bundled PS) or a
 * remote URL (Vana session auth). The shape unifies the two so callers
 * don't have to branch on serverMode at every site.
 */
export type IngestTarget =
  | { kind: "local"; port: number }
  | { kind: "remote"; baseUrl: string; bearerToken: string }

export function getScopeForPlatform(platformId: string): string | null {
  return getPlatformIngestScope(platformId)
}

/** Extract scoped keys from data (keys containing a dot, excluding metadata). */
export function extractScopeKeys(data: Record<string, unknown>): string[] {
  return Object.keys(data).filter(
    (key) => key.includes(".") && !METADATA_KEYS.includes(key)
  )
}

function endpointFor(target: IngestTarget, scope: string): string {
  if (target.kind === "local") {
    return `http://localhost:${target.port}/v1/data/${scope}`
  }
  return `${target.baseUrl.replace(/\/+$/, "")}/v1/data/${scope}`
}

function headersFor(target: IngestTarget): Record<string, string> {
  const base: Record<string, string> = { "Content-Type": "application/json" }
  if (target.kind === "remote") {
    base.Authorization = `Bearer ${target.bearerToken}`
  }
  return base
}

export async function ingestData(
  target: IngestTarget,
  scope: string,
  data: object
): Promise<void> {
  const { fetch: tauriFetch } = await import("@tauri-apps/plugin-http")
  const res = await tauriFetch(endpointFor(target, scope), {
    method: "POST",
    headers: headersFor(target),
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Ingest failed: ${res.status}${text ? ` ${text}` : ""}`)
  }
}

/**
 * Ingest export data to a personal server, detecting per-scope keys
 * automatically. Falls back to single-scope ingest for old-format connectors.
 *
 * Backwards-compat: if `target` is a number, it's treated as a local port.
 * New callers should pass an IngestTarget directly.
 */
export async function ingestExportData(
  target: IngestTarget | number,
  platformId: string,
  data: Record<string, unknown>
): Promise<string[]> {
  const t: IngestTarget =
    typeof target === "number" ? { kind: "local", port: target } : target
  const scopeKeys = extractScopeKeys(data)

  if (scopeKeys.length > 0) {
    const ingested: string[] = []
    for (const scope of scopeKeys) {
      try {
        await ingestData(t, scope, data[scope] as object)
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
    await ingestData(t, scope, data as object)
    return [scope]
  }
  return []
}
