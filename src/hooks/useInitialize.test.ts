import { beforeEach, describe, expect, it, vi } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { useInitialize } from "./useInitialize"

const mockDispatch = vi.fn()
const mockInvoke = vi.fn()
const mockCheckConnectorUpdates = vi.fn()

let mockState = {
  app: {
    runs: [] as Array<{
      id: string
    }>,
  },
}

vi.mock("react-redux", () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector: (state: typeof mockState) => unknown) =>
    selector(mockState),
}))

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}))

vi.mock("./check-connector-updates", () => ({
  checkConnectorUpdates: (...args: unknown[]) => mockCheckConnectorUpdates(...args),
}))

describe("useInitialize", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState = { app: { runs: [] } }
    mockInvoke.mockResolvedValue([])
    mockCheckConnectorUpdates.mockResolvedValue([])
  })

  it("loads runs and triggers connector update check at app init", async () => {
    renderHook(() => useInitialize())

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("load_runs")
      expect(mockCheckConnectorUpdates).toHaveBeenCalledTimes(1)
    })

    expect(mockCheckConnectorUpdates).toHaveBeenCalledWith(
      mockDispatch,
      expect.objectContaining({
        onError: expect.any(Function),
      })
    )
  })

  it("does not retrigger connector update check on rerender", async () => {
    const { rerender } = renderHook(() => useInitialize())

    await waitFor(() => {
      expect(mockCheckConnectorUpdates).toHaveBeenCalledTimes(1)
    })

    rerender()

    expect(mockCheckConnectorUpdates).toHaveBeenCalledTimes(1)
  })
})
