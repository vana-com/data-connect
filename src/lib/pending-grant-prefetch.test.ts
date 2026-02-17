import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  __unsafeClearAllPendingGrantPrefetchForTests,
  consumePendingGrantPrefetch,
  stashPendingGrantPrefetch,
} from "./pending-grant-prefetch"

describe("pending-grant-prefetch", () => {
  beforeEach(() => {
    __unsafeClearAllPendingGrantPrefetchForTests()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("stashes and consumes prefetch exactly once", () => {
    stashPendingGrantPrefetch("session-1", {
      session: {
        id: "session-1",
        granteeAddress: "0xabc",
        scopes: ["chatgpt.conversations"],
        expiresAt: "2030-01-01T00:00:00.000Z",
      },
      builderManifest: {
        name: "Builder",
        appUrl: "https://builder.example.com",
      },
    })

    expect(consumePendingGrantPrefetch("session-1")).toMatchObject({
      session: { id: "session-1" },
    })
    expect(consumePendingGrantPrefetch("session-1")).toBeUndefined()
  })

  it("expires stale prefetch records", () => {
    vi.useFakeTimers()
    stashPendingGrantPrefetch("session-expired", {
      session: {
        id: "session-expired",
        granteeAddress: "0xdef",
        scopes: ["chatgpt.conversations"],
        expiresAt: "2030-01-01T00:00:00.000Z",
      },
    })

    vi.advanceTimersByTime(1000 * 60 * 5 + 1)
    expect(consumePendingGrantPrefetch("session-expired")).toBeUndefined()
  })
})
