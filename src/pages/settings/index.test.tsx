import { describe, expect, it, beforeEach, vi } from "vitest"
import { cleanup, fireEvent, render } from "@testing-library/react"
import { createMemoryRouter, RouterProvider, useLocation } from "react-router"
import { Provider } from "react-redux"
import { ROUTES } from "@/config/routes"
import { store } from "@/state/store"
import { Settings } from "./index"

const mockUseAuth = vi.fn()
const mockUsePersonalServer = vi.fn()
const mockGetAllConnectedApps = vi.fn()
const mockSubscribeConnectedApps = vi.fn()
const mockRemoveConnectedApp = vi.fn()
const mockInvoke = vi.fn()
const mockGetVersion = vi.fn()

vi.mock("react-router", async () => {
  const actual = await vi.importActual<object>("react-router")
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

vi.mock("@/lib/storage", () => ({
  getAllConnectedApps: () => mockGetAllConnectedApps(),
  subscribeConnectedApps: (callback: () => void) => {
    mockSubscribeConnectedApps(callback)
    return () => {}
  },
  removeConnectedApp: (appId: string) => mockRemoveConnectedApp(appId),
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

const renderSettings = (initialEntry = ROUTES.settings) => {
  const router = createMemoryRouter(
    [{ path: ROUTES.settings, element: <SettingsRouteHarness /> }],
    {
      initialEntries: [initialEntry],
    }
  )

  return render(
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
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
    error: null,
    startServer: vi.fn(),
    stopServer: vi.fn(),
  })
  mockGetAllConnectedApps.mockReturnValue([])
  mockGetVersion.mockResolvedValue("1.2.3")
  mockInvoke.mockImplementation((command: string) => {
    if (command === "get_user_data_path") {
      return Promise.resolve("/tmp/databridge")
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
  it("shows the account section by default", () => {
    const { getByText } = renderSettings()

    expect(getByText("Local-only storage enabled")).toBeTruthy()
    expect(getByText("Sign in")).toBeTruthy()
  })

  it("switches to the apps section from the nav", () => {
    const { getAllByRole, getByText, getByTestId } = renderSettings()

    const [appsButton] = getAllByRole("button", { name: "Authorised Apps" })
    fireEvent.click(appsButton)

    expect(getByText("No connected apps")).toBeTruthy()
    expect(getByTestId("search").textContent).toBe("?section=apps")
  })

  it("shows sign out when authenticated", () => {
    mockUseAuth.mockReturnValue({
      user: { email: "test@databridge.dev" },
      logout: vi.fn(),
      isAuthenticated: true,
      walletAddress: null,
    })

    const { getAllByText } = renderSettings()

    expect(getAllByText("Sign out").length).toBeGreaterThan(0)
  })

  it("reads section from URL", () => {
    const { getByRole } = renderSettings(`${ROUTES.settings}?section=storage`)

    expect(getByRole("heading", { name: "Storage & Server" })).toBeTruthy()
  })

  it("falls back to account for invalid section values", () => {
    const { getByText } = renderSettings(`${ROUTES.settings}?section=invalid`)
    expect(getByText("Local-only storage enabled")).toBeTruthy()
  })

  it("clears source param when switching between non-runs sections", () => {
    const { getAllByRole, getByTestId } = renderSettings(
      `${ROUTES.settings}?section=apps&source=github`
    )

    const [accountButton] = getAllByRole("button", { name: "Account" })
    fireEvent.click(accountButton)

    expect(getByTestId("search").textContent).toBe("")
  })
})
