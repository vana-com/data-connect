import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { render, waitFor, cleanup, fireEvent, screen } from "@testing-library/react"
import { createMemoryRouter, MemoryRouter, RouterProvider } from "react-router-dom"
import { ROUTES } from "@/config/routes"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Home } from "./index"

const mockUsePlatforms = vi.fn()
const mockStartImport = vi.fn()
const mockStopExport = vi.fn()
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
  exportPath?: string
  statusMessage?: string
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
    stopExport: mockStopExport,
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

  return {
    ...render(
      <TooltipProvider delayDuration={120}>
        <RouterProvider router={router} />
      </TooltipProvider>
    ),
    router,
  }
}

describe("Home", () => {
  beforeEach(() => {
    mockStartImport.mockReset()
    mockStopExport.mockReset()
    mockNavigate.mockReset()
    mockRefreshConnectedStatus.mockReset()
    mockConnectedPlatforms = {}
    mockRuns = []
    mockStartImport.mockResolvedValue("run-1")
    mockStopExport.mockResolvedValue(undefined)
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

  it("shows sources tab content", async () => {
    const { getByRole } = renderHome()

    expect(getByRole("heading", { level: 1, name: /your data/i })).toBeTruthy()
    expect(
      getByRole("heading", { name: /your imported data/i })
    ).toBeTruthy()
  })

  it("does not render the connected apps tab or surface", () => {
    const { container } = renderHome()

    expect(
      screen.queryByRole("tab", { name: /connected apps/i })
    ).toBeNull()
    expect(
      container.querySelector('[data-component="connected-apps-list"]')
    ).toBeNull()
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

    const { rerender } = render(
      <TooltipProvider delayDuration={120}>
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      </TooltipProvider>
    )
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
        exportPath: "/tmp/dataconnect/exported_data/OpenAI/ChatGPT/run-1",
      },
    ]

    rerender(
      <TooltipProvider delayDuration={120}>
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      </TooltipProvider>
    )
    await waitFor(() => {
      expect(mockRefreshConnectedStatus).toHaveBeenCalledTimes(1)
    })

    cleanup()
    renderHome()

    expect(
      screen.queryByRole("button", { name: /connect chatgpt/i })
    ).toBeNull()
    expect(screen.getAllByRole("button", { name: /open chatgpt/i }).length).toBeGreaterThan(0)
  })

  it("shows connected source from persisted run even when connected status map is stale", async () => {
    const platform = {
      id: "chatgpt-playwright",
      company: "OpenAI",
      name: "ChatGPT",
      filename: "chatgpt-playwright",
      description: "ChatGPT export",
      isUpdated: false,
      logoURL: "",
      needsConnection: true,
      connectURL: null,
      connectSelector: null,
      exportFrequency: null,
      vectorize_config: null,
      runtime: "playwright",
    }
    mockUsePlatforms.mockReturnValue({
      platforms: [platform],
      connectedPlatforms: {},
      loadPlatforms: vi.fn(),
      refreshConnectedStatus: vi.fn(),
      getPlatformById: vi.fn(),
      isPlatformConnected: vi.fn(() => false),
    })
    mockRuns = [
      {
        id: "chatgpt-playwright-1",
        platformId: "ChatGPT",
        filename: "ChatGPT",
        isConnected: true,
        startDate: new Date().toISOString(),
        status: "success",
        url: "",
        company: "OpenAI",
        name: "ChatGPT",
        logs: "",
        exportPath:
          "/Users/me/Library/Application Support/dev.dataconnect/exported_data/OpenAI/ChatGPT/chatgpt-playwright-1",
      },
    ]

    renderHome()

    expect(
      screen.queryByRole("button", { name: /connect chatgpt/i })
    ).toBeNull()
    expect(screen.getAllByRole("button", { name: /open chatgpt/i }).length).toBeGreaterThan(0)
  })

  it("syncs a connected source from the home list", () => {
    const chatgpt = {
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
      runtime: "playwright",
    }
    mockConnectedPlatforms = { chatgpt: true }
    mockUsePlatforms.mockReturnValue({
      platforms: [chatgpt],
      connectedPlatforms: mockConnectedPlatforms,
      loadPlatforms: vi.fn(),
      refreshConnectedStatus: vi.fn(),
      getPlatformById: vi.fn(),
      isPlatformConnected: vi.fn(id => Boolean(mockConnectedPlatforms[id])),
    })
    mockRuns = [
      {
        id: "run-chatgpt-1",
        platformId: "chatgpt",
        filename: "chatgpt",
        isConnected: true,
        startDate: new Date().toISOString(),
        status: "success",
        url: "",
        company: "OpenAI",
        name: "ChatGPT",
        logs: "",
        exportPath: "/tmp/dataconnect/exported_data/OpenAI/ChatGPT/run-chatgpt-1",
      },
    ]

    renderHome()

    fireEvent.click(
      screen.getByRole("button", {
        name: /fetch latest data for chatgpt/i,
      })
    )

    expect(mockStartImport).toHaveBeenCalledWith(
      expect.objectContaining({ id: "chatgpt" })
    )
  })

  it("disables home sync while another run is waiting for sign-in", () => {
    const chatgpt = {
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
      runtime: "playwright",
    }
    const spotify = {
      id: "spotify",
      company: "Spotify",
      name: "Spotify",
      filename: "spotify",
      description: "Spotify export",
      isUpdated: false,
      logoURL: "",
      needsConnection: true,
      connectURL: null,
      connectSelector: null,
      exportFrequency: null,
      vectorize_config: null,
      runtime: "playwright",
    }
    mockConnectedPlatforms = { chatgpt: true }
    mockUsePlatforms.mockReturnValue({
      platforms: [chatgpt, spotify],
      connectedPlatforms: mockConnectedPlatforms,
      loadPlatforms: vi.fn(),
      refreshConnectedStatus: vi.fn(),
      getPlatformById: vi.fn(),
      isPlatformConnected: vi.fn(id => Boolean(mockConnectedPlatforms[id])),
    })
    mockRuns = [
      {
        id: "run-spotify-1",
        platformId: "spotify",
        filename: "spotify",
        isConnected: false,
        startDate: new Date().toISOString(),
        status: "running",
        statusMessage: "Waiting for sign in...",
        url: "",
        company: "Spotify",
        name: "Spotify",
        logs: "",
      },
    ]

    renderHome()

    expect(
      screen.getByRole("button", {
        name: /fetch latest data for chatgpt/i,
      }).hasAttribute("disabled")
    ).toBe(true)
  })

  it("keeps home sync enabled during non-blocking background collection", () => {
    const chatgpt = {
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
      runtime: "playwright",
    }
    const spotify = {
      id: "spotify",
      company: "Spotify",
      name: "Spotify",
      filename: "spotify",
      description: "Spotify export",
      isUpdated: false,
      logoURL: "",
      needsConnection: true,
      connectURL: null,
      connectSelector: null,
      exportFrequency: null,
      vectorize_config: null,
      runtime: "playwright",
    }
    mockConnectedPlatforms = { chatgpt: true }
    mockUsePlatforms.mockReturnValue({
      platforms: [chatgpt, spotify],
      connectedPlatforms: mockConnectedPlatforms,
      loadPlatforms: vi.fn(),
      refreshConnectedStatus: vi.fn(),
      getPlatformById: vi.fn(),
      isPlatformConnected: vi.fn(id => Boolean(mockConnectedPlatforms[id])),
    })
    mockRuns = [
      {
        id: "run-spotify-1",
        platformId: "spotify",
        filename: "spotify",
        isConnected: true,
        startDate: new Date().toISOString(),
        status: "running",
        statusMessage: "Collecting data...",
        url: "",
        company: "Spotify",
        name: "Spotify",
        logs: "",
      },
    ]

    renderHome()

    const syncButton = screen.getByRole("button", {
      name: /fetch latest data for chatgpt/i,
    })
    expect(syncButton.hasAttribute("disabled")).toBe(false)

    fireEvent.click(syncButton)
    expect(mockStartImport).toHaveBeenCalledWith(
      expect.objectContaining({ id: "chatgpt" })
    )
  })

  it("blocks other source starts while a run is waiting for user action", () => {
    const chatgpt = {
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
      runtime: "playwright",
    }
    const spotify = {
      id: "spotify",
      company: "Spotify",
      name: "Spotify",
      filename: "spotify",
      description: "Spotify export",
      isUpdated: false,
      logoURL: "",
      needsConnection: true,
      connectURL: null,
      connectSelector: null,
      exportFrequency: null,
      vectorize_config: null,
      runtime: "playwright",
    }

    mockUsePlatforms.mockReturnValue({
      platforms: [chatgpt, spotify],
      connectedPlatforms: {},
      loadPlatforms: vi.fn(),
      refreshConnectedStatus: vi.fn(),
      getPlatformById: vi.fn(),
      isPlatformConnected: vi.fn(() => false),
    })

    mockRuns = [
      {
        id: "run-chatgpt-1",
        platformId: "chatgpt",
        filename: "chatgpt",
        isConnected: false,
        startDate: new Date().toISOString(),
        status: "running",
        statusMessage: "Waiting for sign in...",
        url: "",
        company: "OpenAI",
        name: "ChatGPT",
        logs: "",
      },
    ]

    renderHome()

    const spotifyButton = screen.getByRole("button", {
      name: /connect spotify/i,
    })
    expect(spotifyButton.hasAttribute("disabled")).toBe(true)
  })

  it("unblocks other source starts when a run moves to background collecting", () => {
    const chatgpt = {
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
      runtime: "playwright",
    }
    const spotify = {
      id: "spotify",
      company: "Spotify",
      name: "Spotify",
      filename: "spotify",
      description: "Spotify export",
      isUpdated: false,
      logoURL: "",
      needsConnection: true,
      connectURL: null,
      connectSelector: null,
      exportFrequency: null,
      vectorize_config: null,
      runtime: "playwright",
    }

    mockUsePlatforms.mockReturnValue({
      platforms: [chatgpt, spotify],
      connectedPlatforms: {},
      loadPlatforms: vi.fn(),
      refreshConnectedStatus: vi.fn(),
      getPlatformById: vi.fn(),
      isPlatformConnected: vi.fn(() => false),
    })

    mockRuns = [
      {
        id: "run-chatgpt-1",
        platformId: "chatgpt",
        filename: "chatgpt",
        isConnected: true,
        startDate: new Date().toISOString(),
        status: "running",
        statusMessage: "Collecting data...",
        url: "",
        company: "OpenAI",
        name: "ChatGPT",
        logs: "",
      },
    ]

    renderHome()

    const spotifyButton = screen.getByRole("button", { name: /connect spotify/i })
    expect(spotifyButton.hasAttribute("disabled")).toBe(false)

    fireEvent.click(spotifyButton)
    expect(mockStartImport).toHaveBeenCalledWith(
      expect.objectContaining({ id: "spotify" })
    )
  })

  it("asks for confirmation before stopping a recent running import", () => {
    const chatgpt = {
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
      runtime: "playwright",
    }

    mockUsePlatforms.mockReturnValue({
      platforms: [chatgpt],
      connectedPlatforms: {},
      loadPlatforms: vi.fn(),
      refreshConnectedStatus: vi.fn(),
      getPlatformById: vi.fn(),
      isPlatformConnected: vi.fn(() => false),
    })

    mockRuns = [
      {
        id: "run-chatgpt-1",
        platformId: "chatgpt",
        filename: "chatgpt",
        isConnected: true,
        startDate: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        status: "running",
        statusMessage: "Collecting data...",
        url: "",
        company: "OpenAI",
        name: "ChatGPT",
        logs: "",
      },
    ]

    renderHome()

    fireEvent.click(screen.getByRole("button", { name: /cancel import/i }))
    expect(screen.getByText("Cancel import?")).toBeTruthy()
    expect(mockStopExport).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: /stop import/i }))
    expect(mockStopExport).toHaveBeenCalledWith("run-chatgpt-1")
  })

  it("asks for confirmation before stopping a long-running import", () => {
    const chatgpt = {
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
      runtime: "playwright",
    }

    mockUsePlatforms.mockReturnValue({
      platforms: [chatgpt],
      connectedPlatforms: {},
      loadPlatforms: vi.fn(),
      refreshConnectedStatus: vi.fn(),
      getPlatformById: vi.fn(),
      isPlatformConnected: vi.fn(() => false),
    })

    mockRuns = [
      {
        id: "run-chatgpt-1",
        platformId: "chatgpt",
        filename: "chatgpt",
        isConnected: true,
        startDate: new Date(Date.now() - 11 * 60 * 1000).toISOString(),
        status: "running",
        statusMessage: "Collecting data...",
        url: "",
        company: "OpenAI",
        name: "ChatGPT",
        logs: "",
      },
    ]

    renderHome()

    fireEvent.click(screen.getByRole("button", { name: /cancel import/i }))
    expect(screen.getByText("Cancel import?")).toBeTruthy()
    expect(mockStopExport).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: /stop import/i }))
    expect(mockStopExport).toHaveBeenCalledWith("run-chatgpt-1")
  })
})
