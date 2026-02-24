import { describe, expect, it, vi, beforeEach } from "vitest"
import { checkConnectorUpdates } from "./check-connector-updates"
import { setConnectorUpdates, setIsCheckingUpdates } from "../state/store"

const mockInvoke = vi.fn()

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}))

describe("checkConnectorUpdates", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("dispatches loading and updates on success", async () => {
    const dispatch = vi.fn()
    const updates = [
      {
        id: "chatgpt",
        name: "ChatGPT",
        currentVersion: "1.0.0",
        latestVersion: "1.1.0",
        hasUpdate: true,
        isNew: false,
      },
    ]
    mockInvoke.mockResolvedValue(updates)

    const result = await checkConnectorUpdates(dispatch, { force: true })

    expect(result).toEqual(updates)
    expect(mockInvoke).toHaveBeenCalledWith("check_connector_updates", {
      force: true,
    })
    expect(dispatch).toHaveBeenNthCalledWith(1, setIsCheckingUpdates(true))
    expect(dispatch).toHaveBeenNthCalledWith(2, setConnectorUpdates(updates))
    expect(dispatch).toHaveBeenNthCalledWith(3, setIsCheckingUpdates(false))
  })

  it("returns empty updates and calls onError on failure", async () => {
    const dispatch = vi.fn()
    const onError = vi.fn()
    const error = new Error("boom")
    mockInvoke.mockRejectedValue(error)

    const result = await checkConnectorUpdates(dispatch, { onError })

    expect(result).toEqual([])
    expect(onError).toHaveBeenCalledWith(error)
    expect(dispatch).toHaveBeenNthCalledWith(1, setIsCheckingUpdates(true))
    expect(dispatch).toHaveBeenNthCalledWith(2, setIsCheckingUpdates(false))
    expect(dispatch).toHaveBeenCalledTimes(2)
  })
})
