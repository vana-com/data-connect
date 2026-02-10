import { getPlatformIngestScope } from "@/lib/platform/utils"

export function getScopeForPlatform(platformId: string): string | null {
  return getPlatformIngestScope(platformId)
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
