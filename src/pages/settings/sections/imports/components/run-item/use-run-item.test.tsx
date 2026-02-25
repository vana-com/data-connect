import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { Run } from "@/types"
import { useRunItem } from "./use-run-item"

const mockOpenExportFolderPath = vi.fn()
const mockOpenPersonalServerScopeFolder = vi.fn()

vi.mock("@/lib/open-resource", () => ({
  openExportFolderPath: (...args: unknown[]) => mockOpenExportFolderPath(...args),
}))

vi.mock("@/lib/tauri-paths", () => ({
  openPersonalServerScopeFolder: (...args: unknown[]) =>
    mockOpenPersonalServerScopeFolder(...args),
}))

const buildRun = (overrides: Partial<Run> = {}) =>
  ({
    id: "run-github-success",
    platformId: "github",
    filename: "github-export.zip",
    isConnected: true,
    startDate: "2026-02-25T13:08:00.000Z",
    status: "success",
    url: "https://example.com/github",
    company: "GitHub",
    name: "GitHub",
    exportPath:
      "/Users/me/Library/Application Support/dev.dataconnect/exported_data/GitHub/GitHub/github-playwright-1/github_123.json",
    syncedToPersonalServer: true,
    scope: "github.conversations",
    ...overrides,
  }) as Run

describe("useRunItem openFolder", () => {
  it("opens personal server scope folder for synced runs", async () => {
    mockOpenExportFolderPath.mockReset()
    mockOpenPersonalServerScopeFolder.mockReset()
    mockOpenPersonalServerScopeFolder.mockResolvedValue(undefined)

    const { result } = renderHook(() =>
      useRunItem({
        run: buildRun(),
        serverPort: null,
        serverReady: false,
      })
    )

    await act(async () => {
      await result.current.openFolder()
    })

    expect(mockOpenPersonalServerScopeFolder).toHaveBeenCalledWith(
      "github.conversations"
    )
    expect(mockOpenExportFolderPath).not.toHaveBeenCalled()
  })
})
