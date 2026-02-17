import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { ROUTES } from "@/config/routes"
import { Home } from "./index"
import { savePendingGrantRedirect } from "@/lib/storage"

const mockCheckForUpdates = vi.fn()
const mockStartBrowserAuthFlow = vi.fn()
let mockIsAuthenticated = true

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    isAuthenticated: mockIsAuthenticated,
    isLoading: false,
    user: null,
    walletAddress: null,
    accountRole: "normal",
    canAccessDebugRuns: false,
    privyEnabled: true,
    logout: vi.fn(),
  }),
}))

vi.mock("@/lib/start-browser-auth", () => ({
  startBrowserAuthFlow: (...args: unknown[]) =>
    mockStartBrowserAuthFlow(...args),
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
      { path: ROUTES.grant, element: <div>Grant Route</div> },
    ],
    {
      initialEntries: [ROUTES.home],
    }
  )

  return render(<RouterProvider router={router} />)
}

describe("Home", () => {
  beforeEach(() => {
    mockCheckForUpdates.mockClear()
    mockStartBrowserAuthFlow.mockReset()
    mockIsAuthenticated = true
    localStorage.clear()
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

  it("starts browser auth from logged-out state", async () => {
    mockIsAuthenticated = false
    mockStartBrowserAuthFlow.mockResolvedValue("https://passport.vana.org")

    renderHome()

    fireEvent.click(screen.getByRole("button", { name: /sign in with vana passport/i }))
    await waitFor(() => {
      expect(mockStartBrowserAuthFlow).toHaveBeenCalled()
    })
  })

  it("resumes pending grant redirect after auth", async () => {
    savePendingGrantRedirect("/grant?sessionId=session-123&secret=secret-123")
    renderHome()

    await waitFor(() => {
      expect(screen.getByText("Grant Route")).toBeTruthy()
    })
  })
})
