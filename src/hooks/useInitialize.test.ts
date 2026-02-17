import { beforeEach, describe, expect, it, vi } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { setAuthenticated, setRuns } from "../state/store"

const mockDispatch = vi.fn()
const mockInvoke = vi.fn()

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}))

vi.mock("react-redux", () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector: (state: { app: { runs: unknown[] } }) => unknown) =>
    selector({ app: { runs: [] } }),
}))

describe("useInitialize", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    mockInvoke.mockResolvedValue([])
  })

  it("hydrates persisted auth session on startup", async () => {
    localStorage.setItem(
      "v1_auth_session",
      JSON.stringify({
        user: {
          id: "user-1",
          email: "test@vana.org",
        },
        walletAddress: "0xabc",
        masterKeySignature: "0xsig",
        createdAt: "2026-02-17T00:00:00.000Z",
      })
    )

    const { useInitialize } = await import("./useInitialize")
    renderHook(() => useInitialize())

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(
        setAuthenticated({
          user: {
            id: "user-1",
            email: "test@vana.org",
          },
          walletAddress: "0xabc",
          masterKeySignature: null,
        })
      )
    })
    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(setRuns([]))
    })
  })

  it("does not hydrate and clears invalid persisted auth session", async () => {
    localStorage.setItem(
      "v1_auth_session",
      JSON.stringify({
        user: {
          id: "user-1",
          email: "test@vana.org",
        },
        walletAddress: null,
        masterKeySignature: "0xsig",
        createdAt: "2026-02-17T00:00:00.000Z",
      })
    )

    const { useInitialize } = await import("./useInitialize")
    renderHook(() => useInitialize())

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(setRuns([]))
    })

    expect(mockDispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({
        type: setAuthenticated.type,
      })
    )
    expect(localStorage.getItem("v1_auth_session")).toBeNull()
  })
})
