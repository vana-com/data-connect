import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { MemoryRouter } from "react-router-dom"
import type { Platform, Run } from "@/types"
import { ImportHistoryRow } from "./import-history-row"

const mockOpenExportFolderPath = vi.fn()
const mockOpenPersonalServerScopeFolder = vi.fn()

vi.mock("@/lib/open-resource", () => ({
  openExportFolderPath: (...args: unknown[]) => mockOpenExportFolderPath(...args),
}))

vi.mock("@/lib/tauri-paths", () => ({
  openPersonalServerScopeFolder: (...args: unknown[]) =>
    mockOpenPersonalServerScopeFolder(...args),
}))

const platform: Platform = {
  id: "github",
  company: "GitHub",
  name: "GitHub",
  filename: "github",
  description: "GitHub export",
  isUpdated: false,
  logoURL: "",
  needsConnection: true,
  connectURL: null,
  connectSelector: null,
  exportFrequency: null,
  vectorize_config: null,
  runtime: null,
}

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
    itemLabel: "conversations",
    ...overrides,
  }) as Run

describe("ImportHistoryRow reveal action", () => {
  it("reveals synced imports from personal server scope folder", async () => {
    mockOpenExportFolderPath.mockReset()
    mockOpenPersonalServerScopeFolder.mockReset()
    mockOpenPersonalServerScopeFolder.mockResolvedValue(undefined)

    render(
      <MemoryRouter>
        <ImportHistoryRow
          run={
            {
              ...buildRun(),
              scope: "github.conversations",
            } as unknown as Run
          }
          isStopping={false}
          isRemoving={false}
          canRunAgain
          rerunPlatform={platform}
          isErrorExpanded={false}
          onStop={vi.fn()}
          onRunAgain={vi.fn()}
          onRemove={vi.fn().mockResolvedValue(undefined)}
          onToggleErrorDetail={vi.fn()}
        />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole("button", { name: "Reveal" }))

    expect(mockOpenPersonalServerScopeFolder).toHaveBeenCalledWith(
      "github.conversations"
    )
    expect(mockOpenExportFolderPath).not.toHaveBeenCalled()
  })
})
