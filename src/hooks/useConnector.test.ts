import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Platform } from "../types"

const mockInvoke = vi.fn()
const mockDispatch = vi.fn()

const startRun = vi.fn(payload => ({ type: "startRun", payload }))
const updateRunStatus = vi.fn(payload => ({ type: "updateRunStatus", payload }))
const stopRun = vi.fn(payload => ({ type: "stopRun", payload }))
const deleteRun = vi.fn(payload => ({ type: "deleteRun", payload }))

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}))

vi.mock("react-redux", () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector: (state: unknown) => unknown) =>
    selector({ app: { runs: [] } }),
}))

vi.mock("../state/store", () => ({
  startRun,
  updateRunStatus,
  stopRun,
  deleteRun,
}))

const TEST_PLATFORM: Platform = {
  id: "chatgpt",
  company: "OpenAI",
  name: "ChatGPT",
  filename: "chatgpt",
  description: "ChatGPT export",
  isUpdated: false,
  logoURL: "",
  needsConnection: true,
  connectURL: "https://chatgpt.com",
  connectSelector: null,
  exportFrequency: null,
  vectorize_config: null,
  runtime: "playwright",
}

describe("useConnector.startImport", () => {
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(1700000000000)
    mockInvoke.mockReset()
    mockDispatch.mockReset()
    startRun.mockClear()
    updateRunStatus.mockClear()
    stopRun.mockClear()
    deleteRun.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("removes transient run when backend rejects duplicate active run", async () => {
    mockInvoke.mockRejectedValue(new Error("DUPLICATE_ACTIVE_RUN"))
    const { useConnector } = await import("./useConnector")
    const { result } = renderHook(() => useConnector())

    let returnedRunId: string | null | undefined
    await act(async () => {
      returnedRunId = await result.current.startImport(TEST_PLATFORM)
    })

    expect(returnedRunId).toBeNull()
    expect(startRun).toHaveBeenCalledWith(
      expect.objectContaining({ id: "chatgpt-1700000000000" })
    )
    expect(deleteRun).toHaveBeenCalledWith("chatgpt-1700000000000")
    expect(updateRunStatus).not.toHaveBeenCalled()
  })

  it("marks run as error for non-duplicate start failures", async () => {
    mockInvoke.mockRejectedValue(new Error("connection failed"))
    const { useConnector } = await import("./useConnector")
    const { result } = renderHook(() => useConnector())

    let returnedRunId: string | null | undefined
    await act(async () => {
      returnedRunId = await result.current.startImport(TEST_PLATFORM)
    })

    expect(returnedRunId).toBe("chatgpt-1700000000000")
    expect(updateRunStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: "chatgpt-1700000000000",
        status: "error",
      })
    )
    expect(deleteRun).not.toHaveBeenCalled()
  })
})
