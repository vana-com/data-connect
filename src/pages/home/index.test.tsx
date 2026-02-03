import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { render, waitFor, cleanup } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { Home } from "./index"

const mockUseBrowserStatus = vi.fn()
const mockCheckForUpdates = vi.fn()

vi.mock("@/context/BrowserContext", () => ({
  useBrowserStatus: () => mockUseBrowserStatus(),
}))

vi.mock("@/hooks/usePlatforms", () => ({
  usePlatforms: () => ({
    platforms: [],
    connectedPlatforms: {},
    loadPlatforms: vi.fn(),
    refreshConnectedStatus: vi.fn(),
    getPlatformById: vi.fn(),
    isPlatformConnected: vi.fn(() => false),
  }),
}))

vi.mock("@/hooks/useConnector", () => ({
  useConnector: () => ({
    startExport: vi.fn(),
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

vi.mock("react-redux", async () => {
  const actual = await vi.importActual<object>("react-redux")
  return {
    ...actual,
    useSelector: (
      selector: (state: { app: { runs: []; connectedApps: [] } }) => unknown
    ) => selector({ app: { runs: [], connectedApps: [] } }),
  }
})

function renderHome() {
  const router = createMemoryRouter([{ path: "/", element: <Home /> }], {
    initialEntries: ["/"],
  })

  return render(<RouterProvider router={router} />)
}

describe("Home", () => {
  beforeEach(() => {
    mockCheckForUpdates.mockClear()
    mockUseBrowserStatus.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it("shows sources tab content when browser is ready", async () => {
    mockUseBrowserStatus.mockReturnValue({
      status: "ready",
      progress: 0,
      error: null,
      retry: vi.fn(),
      startDownload: vi.fn(),
    })

    const { getByText } = renderHome()

    expect(getByText("Connect sources (more coming soon)")).toBeTruthy()

    await waitFor(() => {
      expect(mockCheckForUpdates).toHaveBeenCalled()
    })
  })

  it("hides tabs when browser is not ready", () => {
    mockUseBrowserStatus.mockReturnValue({
      status: "checking",
      progress: 0,
      error: null,
      retry: vi.fn(),
      startDownload: vi.fn(),
    })

    const { getByText, queryByText } = renderHome()

    expect(getByText("Checking dependencies...")).toBeTruthy()
    expect(queryByText("Connect sources (more coming soon)")).toBeNull()
  })
})
