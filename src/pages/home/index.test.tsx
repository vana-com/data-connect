import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { render, waitFor, cleanup } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { ROUTES } from "@/config/routes"
import { Home } from "./index"

const mockCheckForUpdates = vi.fn()

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
  const router = createMemoryRouter([{ path: ROUTES.home, element: <Home /> }], {
    initialEntries: [ROUTES.home],
  })

  return render(<RouterProvider router={router} />)
}

describe("Home", () => {
  beforeEach(() => {
    mockCheckForUpdates.mockClear()
  })

  afterEach(() => {
    cleanup()
  })

  it("shows sources tab content and checks for updates", async () => {
    const { getByRole } = renderHome()

    expect(
      getByRole("heading", { name: /connect sources/i })
    ).toBeTruthy()

    await waitFor(() => {
      expect(mockCheckForUpdates).toHaveBeenCalled()
    })
  })
})
