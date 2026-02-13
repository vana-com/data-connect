import { describe, it, expect, vi, beforeEach } from "vitest"

const mockInvoke = vi.fn()
const mockIngestData = vi.fn()
const mockDispatch = vi.fn()

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}))

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}))

vi.mock("react-redux", () => ({
  useDispatch: () => mockDispatch,
}))

vi.mock("../state/store", () => ({
  updateRunLogs: vi.fn(),
  updateRunStatus: vi.fn(),
  updateExportStatus: vi.fn(),
  updateRunConnected: vi.fn(),
  updateRunExportData: vi.fn(),
  markRunSynced: (id: string) => ({ type: "markRunSynced", payload: id }),
  store: { getState: () => ({ app: { runs: [] } }) },
}))

vi.mock("../services/personalServerIngest", () => ({
  getScopeForPlatform: (id: string) =>
    id === "chatgpt" ? "chatgpt.conversations" : null,
  ingestData: (...args: unknown[]) => mockIngestData(...args),
}))

vi.mock("../lib/export-data", () => ({
  normalizeExportData: () => ({ itemsExported: 1, itemLabel: "conversations" }),
}))

function makeRun(overrides = {}) {
  return {
    id: "run-1",
    platformId: "chatgpt",
    exportPath: "/tmp/data/run.json",
    syncedToPersonalServer: false,
    status: "success" as const,
    ...overrides,
  }
}

describe("deliverRunToPersonalServer", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInvoke.mockResolvedValue({ content: { conversations: [] } })
  })

  async function importDeliverFn() {
    vi.resetModules()
    const mod = await import("./useEvents")
    return mod.deliverRunToPersonalServer
  }

  it("prevents duplicate delivery when called concurrently for the same run", async () => {
    const deliverRunToPersonalServer = await importDeliverFn()

    // Make ingestData slow — use a deferred promise so both calls overlap
    let resolveIngest!: () => void
    mockIngestData.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveIngest = resolve
      })
    )

    const run = makeRun()

    // Fire two concurrent deliveries for the same run
    const p1 = deliverRunToPersonalServer(run, 8080, mockDispatch)
    const p2 = deliverRunToPersonalServer(run, 8080, mockDispatch)

    // Resolve the slow ingestData
    resolveIngest()
    await Promise.all([p1, p2])

    // ingestData should only have been called once
    expect(mockIngestData).toHaveBeenCalledTimes(1)
  })
})
