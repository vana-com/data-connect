import { beforeEach, describe, expect, it, vi } from "vitest"

const mockInvoke = vi.fn()
const tauriWindow = window as Window & {
  __TAURI__?: unknown
  __TAURI_INTERNALS__?: unknown
}

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke.apply(null, args as []),
}))

describe("auth-session", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete tauriWindow.__TAURI__
    delete tauriWindow.__TAURI_INTERNALS__
  })

  it("hydrates_valid_session_on_startup", async () => {
    tauriWindow.__TAURI__ = {}
    mockInvoke.mockResolvedValue({
      user: { id: "user-1", email: "user@vana.org" },
      walletAddress: "0xabc",
      masterKeySignature: "sig-1",
      savedAtMs: Date.now(),
    })

    const { loadAuthSession } = await import("./auth-session")
    const session = await loadAuthSession()

    expect(mockInvoke).toHaveBeenCalledWith("load_auth_session")
    expect(session).toEqual({
      user: { id: "user-1", email: "user@vana.org" },
      walletAddress: "0xabc",
      masterKeySignature: "sig-1",
      savedAtMs: expect.any(Number),
    })
  })

  it("evicts_invalid_or_stale_session", async () => {
    tauriWindow.__TAURI__ = {}
    mockInvoke
      .mockResolvedValueOnce({
        user: { id: "user-1" },
        walletAddress: "0xabc",
        masterKeySignature: null,
        savedAtMs: Date.now() - 35 * 24 * 60 * 60 * 1000,
      })
      .mockResolvedValueOnce(undefined)

    const { loadAuthSession } = await import("./auth-session")
    const session = await loadAuthSession()

    expect(session).toBeNull()
    expect(mockInvoke).toHaveBeenNthCalledWith(1, "load_auth_session")
    expect(mockInvoke).toHaveBeenNthCalledWith(2, "clear_auth_session")
  })

  it("logout_clears_durable_and_memory_state", async () => {
    tauriWindow.__TAURI__ = {}
    mockInvoke.mockResolvedValue(undefined)

    const { clearAuthSession } = await import("./auth-session")
    await clearAuthSession()

    expect(mockInvoke).toHaveBeenCalledWith("clear_auth_session")
  })
})
