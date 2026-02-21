import { beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import type { Platform, Run } from "@/types"
import { ImportHistoryPanel } from "./import-history-panel"
import { useImportsSection } from "../use-imports-section"

vi.mock("../use-imports-section", () => ({
  useImportsSection: vi.fn(),
}))

const mockedUseImportsSection = vi.mocked(useImportsSection)

const platforms: Platform[] = [
  {
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
  },
  {
    id: "linkedin",
    company: "LinkedIn",
    name: "LinkedIn",
    filename: "linkedin",
    description: "LinkedIn export",
    isUpdated: false,
    logoURL: "",
    needsConnection: true,
    connectURL: null,
    connectSelector: null,
    exportFrequency: null,
    vectorize_config: null,
    runtime: null,
  },
]

function buildRun(
  id: string,
  platformId: string,
  status: Run["status"],
  overrides: Partial<Run> = {}
): Run {
  return {
    id,
    platformId,
    filename: `${platformId}-export.zip`,
    isConnected: true,
    startDate: "2026-01-01T00:00:00.000Z",
    status,
    url: `https://example.com/${platformId}`,
    company: platformId,
    name: platformId,
    ...overrides,
  }
}

type ImportsSectionPanelState = Pick<
  ReturnType<typeof useImportsSection>,
  "activeImports" | "finishedImports" | "platforms" | "startImport" | "stopExport"
>

function renderPanel(overrides: Partial<ImportsSectionPanelState> = {}) {
  const startImport = vi.fn()
  const stopExport = vi.fn()
  const value: ImportsSectionPanelState = {
    activeImports: [],
    finishedImports: [],
    platforms,
    startImport,
    stopExport,
    ...overrides,
  }

  mockedUseImportsSection.mockReturnValue(
    value as unknown as ReturnType<typeof useImportsSection>
  )

  const view = render(
    <MemoryRouter>
      <ImportHistoryPanel />
    </MemoryRouter>
  )

  return { ...view, startImport, stopExport }
}

describe("ImportHistoryPanel", () => {
  beforeEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("shows empty state when there are no imports", () => {
    renderPanel()

    expect(screen.getByText("No imports yet")).not.toBeNull()
    expect(screen.getByRole("link", { name: "Connect Data on Home" })).not.toBeNull()
  })

  it("shows active running and pending states", () => {
    renderPanel({
      activeImports: [
        buildRun("run-running", "github", "running"),
        buildRun("run-pending", "linkedin", "pending"),
      ],
    })

    expect(screen.getByText("Running")).not.toBeNull()
    expect(screen.getByText("Pending")).not.toBeNull()
    expect(screen.getByRole("button", { name: "Stop" })).not.toBeNull()
  })

  it("shows finished statuses and toggles failed run details", () => {
    renderPanel({
      finishedImports: [
        buildRun("run-success", "github", "success"),
        buildRun("run-error", "linkedin", "error", {
          statusMessage: "Authentication expired",
        }),
        buildRun("run-stopped", "github", "stopped"),
      ],
    })

    expect(screen.getByText("Failed")).not.toBeNull()
    expect(screen.getByText("Stopped")).not.toBeNull()
    expect(screen.queryByText("Authentication expired")).toBeNull()

    fireEvent.click(screen.getByLabelText("Show failed run details"))

    expect(screen.getByText("Authentication expired")).not.toBeNull()
  })

  it("hides run again when the same platform already has an active run", () => {
    renderPanel({
      activeImports: [buildRun("run-running", "github", "running")],
      finishedImports: [buildRun("run-finished", "github", "success")],
    })

    expect(screen.queryByText("Run again")).toBeNull()
  })

  it("shows run again and starts import for inactive finished platform", () => {
    const githubPlatform = platforms[0]
    const { startImport } = renderPanel({
      finishedImports: [buildRun("run-finished", "github", "success")],
    })

    fireEvent.click(screen.getByRole("button", { name: "Run again" }))

    expect(startImport).toHaveBeenCalledTimes(1)
    expect(startImport).toHaveBeenCalledWith(githubPlatform)
  })

  it("shows source overview link for completed imports", () => {
    renderPanel({
      finishedImports: [buildRun("run-finished", "github", "success")],
    })

    expect(
      screen.getByRole("link", { name: "View Source" }).getAttribute("href")
    ).toBe("/sources/github")
  })
})
