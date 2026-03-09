import { describe, expect, it, beforeEach, vi } from "vitest"
import { cleanup, fireEvent, render } from "@testing-library/react"
import { createMemoryRouter, RouterProvider, useLocation } from "react-router-dom"
import { Provider } from "react-redux"
import { ROUTES } from "@/config/routes"
import { store } from "@/state/store"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Settings } from "./index"

const mockUseAuth = vi.fn()
const mockUsePersonalServer = vi.fn()
const mockUseConnectedApps = vi.fn()
const mockInvoke = vi.fn()
const mockGetVersion = vi.fn()

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<object>("react-router-dom")
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  }
})

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock("@/hooks/usePersonalServer", () => ({
  usePersonalServer: () => mockUsePersonalServer(),
}))

vi.mock("@/hooks/useConnectedApps", () => ({
  useConnectedApps: () => mockUseConnectedApps(),
}))

vi.mock("@tauri-apps/api/app", () => ({
  getVersion: () => mockGetVersion(),
}))

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}))

function SettingsRouteHarness() {
  const location = useLocation()
  return (
    <>
      <Settings />
      <div data-testid="search">{location.search}</div>
    </>
  )
}

const renderSettings = (initialEntry: string = ROUTES.settings) => {
  const router = createMemoryRouter(
    [{ path: ROUTES.settings, element: <SettingsRouteHarness /> }],
    {
      initialEntries: [initialEntry],
    }
  )

  return render(
    <TooltipProvider delayDuration={120}>
      <Provider store={store}>
        <RouterProvider router={router} />
      </Provider>
    </TooltipProvider>
  )
}

beforeEach(() => {
  cleanup()
  vi.clearAllMocks()
  mockUseAuth.mockReturnValue({
    user: null,
    logout: vi.fn(),
    isAuthenticated: false,
    walletAddress: null,
  })
  mockUsePersonalServer.mockReturnValue({
    status: "stopped",
    port: null,
    devToken: null,
    error: null,
    startServer: vi.fn(),
    stopServer: vi.fn(),
  })
  mockUseConnectedApps.mockReturnValue({
    connectedApps: [],
    fetchConnectedApps: vi.fn(),
    removeApp: vi.fn(),
  })
  mockGetVersion.mockResolvedValue("1.2.3")
  mockInvoke.mockImplementation((command: string) => {
    if (command === "get_user_data_path") {
      return Promise.resolve("/tmp/dataconnect")
    }
    if (command === "get_personal_server_data_path") {
      return Promise.resolve("/tmp/dataconnect/personal-server")
    }
    if (command === "list_browser_sessions") {
      return Promise.resolve([])
    }
    if (command === "check_browser_available") {
      return Promise.resolve({
        available: false,
        browser_type: "system",
        needs_download: false,
      })
    }
    return Promise.resolve(null)
  })
})

describe("Settings", () => {
  it("fetches connected apps when the Personal Server is ready", () => {
    const mockFetchConnectedApps = vi.fn()
    mockUsePersonalServer.mockReturnValue({
      status: "running",
      port: 4319,
      devToken: "dev-token",
      error: null,
      startServer: vi.fn(),
      stopServer: vi.fn(),
    })
    mockUseConnectedApps.mockReturnValue({
      connectedApps: [],
      fetchConnectedApps: mockFetchConnectedApps,
      removeApp: vi.fn(),
    })

    renderSettings()

    expect(mockFetchConnectedApps).toHaveBeenCalledWith(4319, "dev-token")
  })

  it("shows the app access section by default", () => {
    const { getByRole, getByText } = renderSettings()

    expect(getByRole("heading", { name: "App access" })).toBeTruthy()
    expect(getByText("No connected apps")).toBeTruthy()
  })

  it("switches to the apps section from the nav", () => {
    const { getAllByRole, getByText, getByTestId } = renderSettings()

    const [appsButton] = getAllByRole("button", { name: "App access" })
    fireEvent.click(appsButton)

    expect(getByText("No connected apps")).toBeTruthy()
    expect(getByTestId("search").textContent).toBe("")
  })

  it("shows sign out when authenticated", () => {
    mockUseAuth.mockReturnValue({
      user: { email: "test@dataconnect.dev" },
      logout: vi.fn(),
      isAuthenticated: true,
      walletAddress: null,
    })

    const { getAllByText } = renderSettings(`${ROUTES.settings}?section=account`)

    expect(getAllByText("Sign out").length).toBeGreaterThan(0)
  })

  it("reads section from URL", () => {
    const { getByRole } = renderSettings(`${ROUTES.settings}?section=storage`)

    expect(getByRole("heading", { name: "Storage & Server" })).toBeTruthy()
  })

  it("falls back to connected apps for invalid section values", () => {
    const { getByRole } = renderSettings(`${ROUTES.settings}?section=invalid`)
    expect(getByRole("heading", { name: "App access" })).toBeTruthy()
  })

  it("clears source param when switching between non-import sections", () => {
    const { getAllByRole, getByTestId } = renderSettings(
      `${ROUTES.settings}?section=apps&source=github`
    )

    const [credentialsButton] = getAllByRole("button", {
      name: "Credentials",
    })
    fireEvent.click(credentialsButton)

    expect(getByTestId("search").textContent).toBe("?section=credentials")
  })
})
