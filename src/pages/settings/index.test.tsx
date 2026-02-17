import { describe, expect, it, beforeEach, vi } from "vitest"
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react"
import { createMemoryRouter, RouterProvider, useLocation } from "react-router"
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
const mockListen = vi.fn()
const mockSaveAuthSession = vi.fn()

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

vi.mock("@/hooks/useConnectedApps", () => ({
  useConnectedApps: () => mockUseConnectedApps(),
}))

vi.mock("@tauri-apps/api/app", () => ({
  getVersion: () => mockGetVersion(),
}))

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}))

vi.mock("@tauri-apps/api/event", () => ({
  listen: (...args: unknown[]) => mockListen(...args),
}))

vi.mock("@/services/auth-session", () => ({
  saveAuthSession: (...args: unknown[]) => mockSaveAuthSession(...args),
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
  vi.unstubAllEnvs()
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
  mockUseConnectedApps.mockReturnValue({
    connectedApps: [],
    fetchConnectedApps: vi.fn(),
    removeApp: vi.fn(),
  })
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
  mockListen.mockResolvedValue(vi.fn())
})

describe("Settings", () => {
  it("shows the account section by default", () => {
    const { getAllByRole } = renderSettings()

    expect(getAllByRole("heading", { name: "Account" }).length).toBeGreaterThan(0)
    expect(getAllByRole("button", { name: "Sign in" }).length).toBeGreaterThan(0)
  })

  it("switches to the apps section from the nav", () => {
    const { getAllByRole, getByText, getByTestId } = renderSettings()

    const [appsButton] = getAllByRole("button", { name: "Connected apps" })
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
    const { getAllByRole } = renderSettings(`${ROUTES.settings}?section=invalid`)
    expect(getAllByRole("heading", { name: "Account" }).length).toBeGreaterThan(0)
  })

  it("clears source param when switching between non-import sections", () => {
    const { getAllByRole, getByTestId } = renderSettings(
      `${ROUTES.settings}?section=apps&source=github`
    )

    const [accountButton] = getAllByRole("button", { name: "Account" })
    fireEvent.click(accountButton)

    expect(getByTestId("search").textContent).toBe("")
  })

  it("starts browser auth from settings sign in", async () => {
    vi.stubEnv("VITE_PRIVY_APP_ID", "test-app-id")
    vi.stubEnv("VITE_PRIVY_CLIENT_ID", "test-client-id")

    const { getAllByRole } = renderSettings()
    const [signInButton] = getAllByRole("button", { name: "Sign in" })
    fireEvent.click(signInButton)

    await waitFor(() => {
      expect(mockListen).toHaveBeenCalledWith("auth-complete", expect.any(Function))
      expect(mockInvoke).toHaveBeenCalledWith("start_browser_auth", {
        privyAppId: "test-app-id",
        privyClientId: "test-client-id",
      })
    })
  })

  it("persists auth session after auth-complete success event", async () => {
    vi.stubEnv("VITE_PRIVY_APP_ID", "test-app-id")
    vi.stubEnv("VITE_PRIVY_CLIENT_ID", "test-client-id")

    const unlisten = vi.fn()
    mockListen.mockResolvedValue(unlisten)

    const { getAllByRole } = renderSettings()
    const [signInButton] = getAllByRole("button", { name: "Sign in" })
    fireEvent.click(signInButton)

    await waitFor(() => {
      expect(mockListen).toHaveBeenCalledWith("auth-complete", expect.any(Function))
    })

    const callback = mockListen.mock.calls[0][1] as (event: {
      payload: {
        success: boolean
        user?: { id: string; email: string | null }
        walletAddress?: string | null
        masterKeySignature?: string | null
      }
    }) => void

    callback({
      payload: {
        success: true,
        user: {
          id: "did:privy:test-user",
          email: "test@databridge.dev",
        },
        walletAddress: "0xabc",
        masterKeySignature: "sig",
      },
    })

    await waitFor(() => {
      expect(mockSaveAuthSession).toHaveBeenCalledWith({
        user: {
          id: "did:privy:test-user",
          email: "test@databridge.dev",
        },
        walletAddress: "0xabc",
        masterKeySignature: "sig",
      })
      expect(unlisten).toHaveBeenCalledTimes(1)
    })
  })
})
