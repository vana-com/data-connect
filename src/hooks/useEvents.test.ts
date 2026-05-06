import { beforeEach, describe, expect, it, vi } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"
import type { AppConfig } from "../types"

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
const mockRefreshAccessToken = vi.fn()
let currentRuns: Array<Record<string, unknown>> = []
let currentAppConfig: AppConfig = {
  storageProvider: "local",
  serverMode: "local",
}

type EventHandler<T = unknown> = (event: { payload: T }) => void
const listeners = new Map<string, EventHandler>()

vi.mock("react-redux", () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector: (state: unknown) => unknown) =>
    selector({ app: { appConfig: currentAppConfig } }),
  shallowEqual: vi.fn(),
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

vi.mock("../services/vanaSession", () => ({
  refreshAccessToken: (...args: unknown[]) => mockRefreshAccessToken(...args),
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
      getState: () => ({
        app: { runs: currentRuns, appConfig: currentAppConfig },
      }),
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
    currentAppConfig = {
      storageProvider: "local",
      serverMode: "local",
    }
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

  it("surfaces remote URL discovery gaps after saving an export", async () => {
    const useEvents = await importHook()
    const exportPath = "/tmp/dataconnect/exported_data/OpenAI/ChatGPT/run-1"
    currentAppConfig = {
      storageProvider: "local",
      serverMode: "remote",
      vanaAccessToken: "ory_at_test",
      vanaAccessTokenExpiresAt: Math.floor(Date.now() / 1000) + 900,
    }

    mockInvoke.mockImplementation((command: string) => {
      if (command === "write_export_data") {
        return Promise.resolve(exportPath)
      }
      return Promise.resolve(null)
    })

    renderHook(() => useEvents())

    await act(async () => {
      emit("export-complete", {
        runId: "chatgpt-run-1",
        platformId: "chatgpt-playwright",
        company: "OpenAI",
        name: "ChatGPT",
        data: {
          platform: "chatgpt",
          company: "OpenAI",
          exportedAt: "2026-05-06T00:00:00.000Z",
          conversations: [],
        },
        timestamp: Date.now(),
      })
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mockDispatch).toHaveBeenCalledWith({
      type: "app/updateRunExportData",
      payload: {
        runId: "chatgpt-run-1",
        statusMessage:
          "Export saved locally. Add a Personal Server URL to deliver it.",
      },
    })
    expect(trackSyncSkipped).toHaveBeenCalledWith(
      expect.objectContaining({
        collectionRunId: "chatgpt-run-1",
        reason: "server_unavailable",
      })
    )
  })

  it("re-delivers an existing saved export when remote config becomes usable", async () => {
    const { ingestExportData } =
      await import("../services/personalServerIngest")
    vi.mocked(ingestExportData).mockResolvedValueOnce(["chatgpt.conversations"])
    const useEvents = await importHook()
    currentAppConfig = {
      storageProvider: "local",
      serverMode: "remote",
      remoteServerUrl: "https://0xfake.myvana.app",
      vanaAccessToken: "ory_at_test",
      vanaAccessTokenExpiresAt: Math.floor(Date.now() / 1000) + 900,
    }
    currentRuns = [
      {
        id: "chatgpt-run-1",
        platformId: "chatgpt-playwright",
        company: "OpenAI",
        name: "ChatGPT",
        startDate: "2026-05-06T00:00:00.000Z",
        status: "success",
        exportPath: "/tmp/dataconnect/exported_data/OpenAI/ChatGPT/run-1",
        syncedToPersonalServer: false,
      },
    ]

    mockInvoke.mockImplementation((command: string) => {
      if (command === "load_run_export_data") {
        return Promise.resolve({
          content: {
            platform: "chatgpt",
            company: "OpenAI",
            exportedAt: "2026-05-06T00:00:00.000Z",
          },
        })
      }
      if (command === "mark_export_synced") {
        return Promise.resolve(null)
      }
      return Promise.resolve(null)
    })

    renderHook(() => useEvents())

    await waitFor(() => {
      expect(ingestExportData).toHaveBeenCalledWith(
        {
          kind: "remote",
          baseUrl: "https://0xfake.myvana.app",
          bearerToken: "ory_at_test",
        },
        "chatgpt-playwright",
        expect.objectContaining({ platform: "chatgpt" })
      )
    })
    expect(mockInvoke).toHaveBeenCalledWith("mark_export_synced", {
      runId: "chatgpt-run-1",
      exportPath: "/tmp/dataconnect/exported_data/OpenAI/ChatGPT/run-1",
      itemsExported: null,
      itemLabel: null,
      scope: "chatgpt.conversations",
    })
    expect(mockDispatch).toHaveBeenCalledWith({
      type: "app/markRunSynced",
      payload: { runId: "chatgpt-run-1", scope: "chatgpt.conversations" },
    })
  })

  it("refreshes a Vana token before re-delivering a saved export", async () => {
    const { ingestExportData } =
      await import("../services/personalServerIngest")
    vi.mocked(ingestExportData).mockResolvedValueOnce(["chatgpt.conversations"])
    mockRefreshAccessToken.mockResolvedValueOnce({
      access_token: "ory_at_rotated",
      refresh_token: "ory_rt_rotated",
      expires_in: 900,
      token_type: "bearer",
    })
    const useEvents = await importHook()
    currentAppConfig = {
      storageProvider: "local",
      serverMode: "remote",
      remoteServerUrl: "https://0xfake.myvana.app",
      vanaRefreshToken: "ory_rt_old",
    }
    currentRuns = [
      {
        id: "chatgpt-run-refresh",
        platformId: "chatgpt-playwright",
        company: "OpenAI",
        name: "ChatGPT",
        startDate: "2026-05-06T00:00:00.000Z",
        status: "success",
        exportPath: "/tmp/dataconnect/exported_data/OpenAI/ChatGPT/run-refresh",
        syncedToPersonalServer: false,
      },
    ]

    mockInvoke.mockImplementation((command: string) => {
      if (command === "load_run_export_data") {
        return Promise.resolve({
          content: {
            platform: "chatgpt",
            company: "OpenAI",
            exportedAt: "2026-05-06T00:00:00.000Z",
          },
        })
      }
      if (command === "mark_export_synced") {
        return Promise.resolve(null)
      }
      return Promise.resolve(null)
    })

    renderHook(() => useEvents())

    await waitFor(() => {
      expect(mockRefreshAccessToken).toHaveBeenCalledWith("ory_rt_old")
      expect(ingestExportData).toHaveBeenCalledWith(
        {
          kind: "remote",
          baseUrl: "https://0xfake.myvana.app",
          bearerToken: "ory_at_rotated",
        },
        "chatgpt-playwright",
        expect.objectContaining({ platform: "chatgpt" })
      )
    })
    expect(mockDispatch).toHaveBeenCalledWith({
      type: "app/setAppConfig",
      payload: expect.objectContaining({
        vanaAccessToken: "ory_at_rotated",
        vanaRefreshToken: "ory_rt_rotated",
        vanaAccessTokenExpiresAt: expect.any(Number),
      }),
    })
  })
})
