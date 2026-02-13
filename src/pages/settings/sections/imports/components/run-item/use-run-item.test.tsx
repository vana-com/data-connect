import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, waitFor } from "@testing-library/react"
import { Provider } from "react-redux"
import { setRuns, store } from "@/state/store"
import type { Run } from "@/types"
import { RunItem } from "./run-item"

const mockInvoke = vi.fn()
const mockIngestData = vi.fn()

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}))

vi.mock("@/services/personalServerIngest", () => ({
  getScopeForPlatform: (id: string) =>
    id === "chatgpt" || id === "chatgpt-playwright" ? "chatgpt.conversations" : null,
  ingestData: (...args: unknown[]) => mockIngestData(...args),
}))

vi.mock("@/lib/open-resource", () => ({
  openLocalPath: vi.fn(() => Promise.resolve()),
}))

const RUN_ID = "run-manual-ingest-test"

function makeRun(overrides: Partial<Run> = {}): Run {
  return {
    id: RUN_ID,
    platformId: "chatgpt",
    filename: "chatgpt-export.zip",
    isConnected: true,
    startDate: "2026-01-15T00:00:00.000Z",
    status: "success",
    url: "https://chat.openai.com",
    company: "OpenAI",
    name: "ChatGPT",
    exportPath: "/tmp/exported_data/OpenAI/ChatGPT/run.json",
    syncedToPersonalServer: false,
    ...overrides,
  }
}

describe("useRunItem handleIngest", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInvoke.mockResolvedValue({ content: { platform: "chatgpt", conversations: [] } })
    mockIngestData.mockResolvedValue(undefined)

    const run = makeRun()
    store.dispatch(setRuns([run]))
  })

  it("dispatches markRunSynced after successful ingest so run is excluded from personal-server-ready catch-up", async () => {
    const run = store.getState().app.runs[0]
    const { getByTitle } = render(
      <Provider store={store}>
        <RunItem
          run={run}
          onStop={() => {}}
          serverPort={8080}
          serverReady={true}
        />
      </Provider>
    )

    const ingestButton = getByTitle("Send to personal server")
    fireEvent.click(ingestButton)

    await waitFor(() => {
      expect(mockIngestData).toHaveBeenCalled()
    })

    const runAfterIngest = store.getState().app.runs.find((r) => r.id === RUN_ID)
    expect(runAfterIngest?.syncedToPersonalServer).toBe(true)
  })
})
