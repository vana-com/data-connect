import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { render, waitFor, cleanup, fireEvent, screen } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { ROUTES } from "@/config/routes"
import { Home } from "./index"

const mockCheckForUpdates = vi.fn()
const mockUsePlatforms = vi.fn()
const mockStartImport = vi.fn()
const mockNavigate = vi.fn()
const mockRefreshConnectedStatus = vi.fn()
let mockConnectedPlatforms: Record<string, boolean> = {}
let mockRuns: Array<{
  id: string
  platformId: string
  filename: string
  isConnected: boolean
  startDate: string
  status: "pending" | "running" | "success" | "error" | "stopped"
  url: string
  company: string
  name: string
  logs: string
}> = []

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom"
  )
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock("@/hooks/usePlatforms", () => ({
  usePlatforms: () => mockUsePlatforms(),
}))

vi.mock("@/hooks/useConnector", () => ({
  useConnector: () => ({
    startImport: mockStartImport,
  }),
}))

vi.mock("@/hooks/useConnectorUpdates", () => ({
  useConnectorUpdates: () => ({
    updates: [],
    isCheckingUpdates: false,
    error: null,
    checkForUpdates: mockCheckForUpdates,
    downloadConnector: vi.fn(),
    isDownloading: () => false,
    lastUpdateCheck: null,
    hasUpdates: false,
    updateCount: 0,
    newConnectorCount: 0,
    updateableCount: 0,
  }),
}))

vi.mock("@/hooks/useConnectedApps", () => ({
  useConnectedApps: () => ({
    connectedApps: [],
    fetchConnectedApps: vi.fn(),
    removeApp: vi.fn(),
  }),
}))

vi.mock("@/hooks/usePersonalServer", () => ({
  usePersonalServer: () => ({
    status: "stopped",
    port: null,
    tunnelUrl: null,
    error: null,
    startServer: vi.fn(),
    stopServer: vi.fn(),
  }),
}))

vi.mock("react-redux", async () => {
  const actual = await vi.importActual<object>("react-redux")
  return {
    ...actual,
    useSelector: (
      selector: (state: { app: { runs: typeof mockRuns } }) => unknown
    ) => selector({ app: { runs: mockRuns } }),
  }
})

function renderHome() {
  const router = createMemoryRouter(
    [
      { path: ROUTES.home, element: <Home /> },
      { path: ROUTES.settings, element: <div>Settings Route</div> },
    ],
    {
      initialEntries: [ROUTES.home],
    }
  )

  return { ...render(<RouterProvider router={router} />), router }
}

describe("Home", () => {
  beforeEach(() => {
    mockCheckForUpdates.mockClear()
    mockStartImport.mockReset()
    mockNavigate.mockReset()
    mockRefreshConnectedStatus.mockReset()
    mockConnectedPlatforms = {}
    mockRuns = []
    mockStartImport.mockResolvedValue("run-1")
    mockUsePlatforms.mockReturnValue({
      platforms: [],
      connectedPlatforms: mockConnectedPlatforms,
      loadPlatforms: vi.fn(),
      refreshConnectedStatus: mockRefreshConnectedStatus,
      getPlatformById: vi.fn(),
      isPlatformConnected: vi.fn(id => Boolean(mockConnectedPlatforms[id])),
    })
  })

  afterEach(() => {
    cleanup()
  })

  it("shows sources tab content and checks for updates", async () => {
    const { getByRole } = renderHome()

    expect(
      getByRole("heading", { name: /your connected data/i })
    ).toBeTruthy()

    await waitFor(() => {
      expect(mockCheckForUpdates).toHaveBeenCalled()
    })
  })

  it("starts import without navigating to import history", async () => {
    let resolveStartImport: (value: string) => void
    const startImportPromise = new Promise<string>(resolve => {
      resolveStartImport = resolve
    })
    mockStartImport.mockReturnValue(startImportPromise)
    mockUsePlatforms.mockReturnValue({
      platforms: [
        {
          id: "chatgpt",
          company: "OpenAI",
          name: "ChatGPT",
          filename: "chatgpt",
          description: "ChatGPT export",
          isUpdated: false,
          logoURL: "",
          needsConnection: true,
          connectURL: null,
          connectSelector: null,
          exportFrequency: null,
          vectorize_config: null,
          runtime: null,
        },
      ],
      connectedPlatforms: {},
      loadPlatforms: vi.fn(),
      refreshConnectedStatus: vi.fn(),
      getPlatformById: vi.fn(),
      isPlatformConnected: vi.fn(() => false),
    })
    const { getByRole, router } = renderHome()

    fireEvent.click(getByRole("button", { name: /connect chatgpt/i }))

    expect(mockStartImport).toHaveBeenCalledTimes(1)
    expect(mockStartImport).toHaveBeenCalledWith(
      expect.objectContaining({ id: "chatgpt" })
    )
    expect(router.state.location.pathname).toBe(ROUTES.home)

    resolveStartImport!("run-1")

    await startImportPromise
    await Promise.resolve()

    expect(mockNavigate).not.toHaveBeenCalled()
    expect(router.state.location.pathname).toBe(ROUTES.home)
    expect(router.state.location.search).toBe("")
    expect(screen.queryByText("Settings Route")).toBeNull()
  })

  it("moves a source from available to connected after successful import", async () => {
    const platform = {
      id: "chatgpt",
      company: "OpenAI",
      name: "ChatGPT",
      filename: "chatgpt",
      description: "ChatGPT export",
      isUpdated: false,
      logoURL: "",
      needsConnection: true,
      connectURL: null,
      connectSelector: null,
      exportFrequency: null,
      vectorize_config: null,
      runtime: null,
    }
    mockRefreshConnectedStatus.mockImplementation(async () => {
      mockConnectedPlatforms = { ...mockConnectedPlatforms, chatgpt: true }
    })
    mockUsePlatforms.mockReturnValue({
      platforms: [platform],
      connectedPlatforms: mockConnectedPlatforms,
      loadPlatforms: vi.fn(),
      refreshConnectedStatus: mockRefreshConnectedStatus,
      getPlatformById: vi.fn(),
      isPlatformConnected: vi.fn(id => Boolean(mockConnectedPlatforms[id])),
    })

    const { rerender, router } = renderHome()
    expect(
      screen.getByRole("button", { name: /connect chatgpt/i })
    ).toBeTruthy()

    mockRuns = [
      {
        id: "run-1",
        platformId: "chatgpt",
        filename: "chatgpt",
        isConnected: true,
        startDate: new Date().toISOString(),
        status: "success",
        url: "",
        company: "OpenAI",
        name: "ChatGPT",
        logs: "",
      },
    ]

    rerender(<RouterProvider router={router} />)
    await waitFor(() => {
      expect(mockRefreshConnectedStatus).toHaveBeenCalledTimes(1)
    })

    cleanup()
    renderHome()

    expect(
      screen.queryByRole("button", { name: /connect chatgpt/i })
    ).toBeNull()
    expect(screen.getByRole("button", { name: /chatgpt/i })).toBeTruthy()
  })
})
