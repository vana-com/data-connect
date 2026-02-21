import { beforeEach, describe, expect, it, vi } from "vitest"
import { renderHook, act } from "@testing-library/react"

const mockDispatch = vi.fn()
const mockInvoke = vi.fn()

type EventHandler<T = unknown> = (event: { payload: T }) => void
const listeners = new Map<string, EventHandler>()

vi.mock("react-redux", () => ({
  useDispatch: () => mockDispatch,
}))

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}))

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn((eventName: string, handler: EventHandler) => {
    listeners.set(eventName, handler)
    return Promise.resolve(() => {
      listeners.delete(eventName)
    })
  }),
}))

vi.mock("../services/personalServerIngest", () => ({
  getScopeForPlatform: vi.fn(() => null),
  ingestData: vi.fn(),
}))

vi.mock("../state/store", async importOriginal => {
  const actual = await importOriginal<typeof import("../state/store")>()
  return {
    ...actual,
    store: {
      ...actual.store,
      getState: () => ({ app: { runs: [] } }),
    },
  }
})

function emit<T>(eventName: string, payload: T) {
  const listener = listeners.get(eventName)
  if (!listener) {
    throw new Error(`No listener registered for ${eventName}`)
  }
  listener({ payload })
}

async function importHook() {
  const mod = await import("./useEvents")
  return mod.useEvents
}

describe("useEvents", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    listeners.clear()
  })

  it("persists export-complete payloads missing company using event metadata", async () => {
    const useEvents = await importHook()
    const exportPath = "/tmp/dataconnect/exported_data/LinkedIn/LinkedIn/run-1"

    mockInvoke.mockImplementation((command: string) => {
      if (command === "write_export_data") {
        return Promise.resolve(exportPath)
      }
      if (command === "get_personal_server_status") {
        return Promise.resolve({ running: false })
      }
      return Promise.resolve(null)
    })

    renderHook(() => useEvents())

    await act(async () => {
      emit("export-complete", {
        runId: "linkedin-playwright-1",
        platformId: "linkedin-playwright",
        company: "LinkedIn",
        name: "LinkedIn",
        data: {
          platform: "linkedin",
          exportSummary: { count: 3, label: "profile items" },
        },
        timestamp: Date.now(),
      })
      await Promise.resolve()
    })

    expect(mockInvoke).toHaveBeenCalledWith("write_export_data", {
      runId: "linkedin-playwright-1",
      platformId: "linkedin-playwright",
      company: "LinkedIn",
      name: "LinkedIn",
      data: expect.any(String),
    })
    expect(mockDispatch).toHaveBeenCalledWith({
      type: "app/updateExportStatus",
      payload: {
        runId: "linkedin-playwright-1",
        exportPath,
        exportSize: expect.any(Number),
      },
    })
  })
})
