import { beforeEach, describe, expect, it, vi } from "vitest"
import { renderHook, act } from "@testing-library/react"

const mockDispatch = vi.fn()
const mockInvoke = vi.fn()
const trackCollectionCompleted = vi.fn()
const trackCollectionFailed = vi.fn()
const trackCollectionPartial = vi.fn()
const trackCollectionCancelled = vi.fn()
const trackCollectionNeedsInput = vi.fn()
const trackSyncCompleted = vi.fn()
const trackSyncFailed = vi.fn()
const trackSyncSkipped = vi.fn()
const trackSyncStarted = vi.fn()
let currentRuns: Array<Record<string, unknown>> = []

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
  ingestExportData: vi.fn(() => Promise.resolve([])),
}))

vi.mock("@/lib/telemetry/events", () => ({
  trackCollectionCancelled,
  trackCollectionCompleted,
  trackCollectionFailed,
  trackCollectionPartial,
  trackCollectionNeedsInput,
  trackSyncCompleted,
  trackSyncFailed,
  trackSyncSkipped,
  trackSyncStarted,
}))

vi.mock("../state/store", async importOriginal => {
  const actual = await importOriginal<typeof import("../state/store")>()
  return {
    ...actual,
    store: {
      ...actual.store,
      getState: () => ({ app: { runs: currentRuns } }),
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
    currentRuns = []
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

  it("treats terminal partial as partial telemetry without overwriting the run to error", async () => {
    const useEvents = await importHook()
    currentRuns = [
      {
        id: "chatgpt-run-1",
        platformId: "chatgpt-playwright",
        company: "OpenAI",
        name: "ChatGPT",
        startDate: "2026-04-14T12:00:00.000Z",
        status: "success",
        exportPath: "/tmp/export",
        syncedToPersonalServer: false,
      },
    ]

    renderHook(() => useEvents())

    await act(async () => {
      emit("connector-status", {
        runId: "chatgpt-run-1",
        status: {
          type: "ERROR",
          message: "Collection completed with partial data",
          outcome: "partial",
          errorClass: "selector_error",
          recordCount: 12,
          scopeSummary: {
            requested: 2,
            produced: 1,
            degraded: 0,
            omitted: 1,
          },
        },
        timestamp: Date.now(),
      })
      await Promise.resolve()
    })

    expect(mockDispatch).toHaveBeenCalledWith({
      type: "app/updateRunStatus",
      payload: {
        runId: "chatgpt-run-1",
        status: "partial",
        endDate: expect.any(String),
      },
    })
    expect(trackCollectionPartial).toHaveBeenCalledWith({
      collectionRunId: "chatgpt-run-1",
      source: "chatgpt",
      durationMs: expect.any(Number),
      errorClass: "selector_error",
      recordCount: 12,
      scopeSummary: {
        requested: 2,
        produced: 1,
        degraded: 0,
        omitted: 1,
      },
    })
    expect(trackCollectionFailed).not.toHaveBeenCalled()
  })
})
