import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { render, waitFor, cleanup, fireEvent, screen } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { ROUTES } from "@/config/routes"
import { Home } from "./index"

const mockCheckForUpdates = vi.fn()
const mockUsePlatforms = vi.fn()
const mockStartImport = vi.fn()

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
      selector: (state: { app: { runs: [] } }) => unknown
    ) => selector({ app: { runs: [] } }),
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
    mockStartImport.mockResolvedValue("run-1")
    mockUsePlatforms.mockReturnValue({
      platforms: [],
      connectedPlatforms: {},
      loadPlatforms: vi.fn(),
      refreshConnectedStatus: vi.fn(),
      getPlatformById: vi.fn(),
      isPlatformConnected: vi.fn(() => false),
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

  it("starts import when clicking an available connector", async () => {
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

    await waitFor(() => {
      expect(mockStartImport).toHaveBeenCalledTimes(1)
      expect(mockStartImport).toHaveBeenCalledWith(
        expect.objectContaining({ id: "chatgpt" })
      )
      expect(screen.getByText("Settings Route")).not.toBeNull()
      expect(router.state.location.pathname).toBe(ROUTES.settings)
      expect(router.state.location.search).toContain("section=imports")
      expect(router.state.location.search).toContain("source=chatgpt")
    })
  })
})
