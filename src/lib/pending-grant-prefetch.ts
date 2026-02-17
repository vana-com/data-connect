import type { PrefetchedGrantData } from "@/pages/grant/types"

const PENDING_GRANT_PREFETCH_TTL_MS = 1000 * 60 * 5 // 5 minutes

type PendingPrefetchRecord = {
  prefetched: PrefetchedGrantData
  createdAtMs: number
}

// Process-scoped ephemeral cache for connect -> grant handoff.
// This avoids relying on react-router location.state for correctness/perf semantics.
const pendingGrantPrefetch = new Map<string, PendingPrefetchRecord>()

function isExpired(record: PendingPrefetchRecord): boolean {
  return Date.now() - record.createdAtMs > PENDING_GRANT_PREFETCH_TTL_MS
}

export function stashPendingGrantPrefetch(
  sessionId: string | undefined,
  prefetched: PrefetchedGrantData | null | undefined
): void {
  if (!sessionId || !prefetched) return
  pendingGrantPrefetch.set(sessionId, {
    prefetched,
    createdAtMs: Date.now(),
  })
}

export function consumePendingGrantPrefetch(
  sessionId: string | undefined
): PrefetchedGrantData | undefined {
  if (!sessionId) return undefined
  const record = pendingGrantPrefetch.get(sessionId)
  if (!record) return undefined
  pendingGrantPrefetch.delete(sessionId)
  if (isExpired(record)) return undefined
  return record.prefetched
}

export function __unsafeClearAllPendingGrantPrefetchForTests(): void {
  pendingGrantPrefetch.clear()
}
