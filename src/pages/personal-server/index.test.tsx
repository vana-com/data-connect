import { beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { Provider } from "react-redux"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ROUTES } from "@/config/routes"
import { store } from "@/state/store"
import { PersonalServer } from "./index"

const mockUseAuth = vi.fn()
const mockUsePersonalServer = vi.fn()
const mockUseConnectedApps = vi.fn()
const mockInvoke = vi.fn()
const mockGetVersion = vi.fn()
const mockOpenExternalUrl = vi.fn()

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

vi.mock("@/lib/open-resource", () => ({
  openLocalPath: vi.fn(),
  openExternalUrl: (...args: unknown[]) => mockOpenExternalUrl(...args),
}))

const renderPersonalServer = () => {
  const router = createMemoryRouter(
    [{ path: ROUTES.personalServer, element: <PersonalServer /> }],
    { initialEntries: [ROUTES.personalServer] }
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
    error: null,
    tunnelUrl: null,
    devToken: null,
    startServer: vi.fn(),
    stopServer: vi.fn(),
  })
  mockUseConnectedApps.mockReturnValue({
    connectedApps: [],
    fetchConnectedApps: vi.fn(),
    removeApp: vi.fn(),
  })
  mockGetVersion.mockResolvedValue("1.2.3")
  mockOpenExternalUrl.mockResolvedValue(true)
  mockInvoke.mockImplementation((command: string) => {
    if (command === "get_user_data_path") return Promise.resolve("/tmp/dataconnect")
    if (command === "get_personal_server_data_path") return Promise.resolve("")
    if (command === "get_log_path") return Promise.resolve("/tmp/dataconnect/logs")
    if (command === "list_browser_sessions") return Promise.resolve([])
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

describe("PersonalServer page", () => {
  it("renders standalone personal server heading and controls", () => {
    const { getByRole } = renderPersonalServer()

    expect(getByRole("heading", { name: "Personal Server" })).toBeTruthy()
    expect(getByRole("button", { name: "Sign in to start" })).toBeTruthy()
  })

  it("hides endpoint and data rows while signed out", () => {
    const { queryByRole, queryByText } = renderPersonalServer()

    expect(queryByRole("button", { name: "Open" })).toBeNull()
    expect(queryByText("Public endpoint")).toBeNull()
  })

  it("attempts external opener for sign-in launch", async () => {
    const windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(null)

    renderPersonalServer()
    fireEvent.click(screen.getByRole("button", { name: "Sign in to start" }))

    await waitFor(() => {
      expect(mockOpenExternalUrl).toHaveBeenCalledTimes(1)
    })

    expect(windowOpenSpy).toHaveBeenCalledTimes(0)
    windowOpenSpy.mockRestore()
  })

  it("shows authenticated UI when debug scenario forces auth", async () => {
    const router = createMemoryRouter(
      [{ path: ROUTES.personalServer, element: <PersonalServer /> }],
      {
        initialEntries: [
          `${ROUTES.personalServer}?personalServerScenario=ui-auth-stopped`,
        ],
      }
    )

    render(
      <TooltipProvider delayDuration={120}>
        <Provider store={store}>
          <RouterProvider router={router} />
        </Provider>
      </TooltipProvider>
    )

    await waitFor(() => {
      expect(screen.getByText("Public endpoint")).toBeTruthy()
    })
    expect(screen.queryByRole("button", { name: "Sign in to start" })).toBeNull()
  })

  it("renders auth-running debug scenario", async () => {
    const router = createMemoryRouter(
      [{ path: ROUTES.personalServer, element: <PersonalServer /> }],
      {
        initialEntries: [
          `${ROUTES.personalServer}?personalServerScenario=ui-auth-running`,
        ],
      }
    )

    render(
      <TooltipProvider delayDuration={120}>
        <Provider store={store}>
          <RouterProvider router={router} />
        </Provider>
      </TooltipProvider>
    )

    await waitFor(() => {
      expect(screen.getByText("Public endpoint")).toBeTruthy()
    })
    expect(screen.getByRole("button", { name: "Stop" })).toBeTruthy()
    expect(screen.getByText("Running")).toBeTruthy()
    expect(screen.getAllByText("https://abc123.server.vana.org").length).toBeGreaterThan(0)
    expect(screen.getByText("MCP endpoint")).toBeTruthy()
    expect(screen.getByText("https://abc123.server.vana.org/mcp")).toBeTruthy()
  })

  it("renders auth-error debug scenario", async () => {
    const router = createMemoryRouter(
      [{ path: ROUTES.personalServer, element: <PersonalServer /> }],
      {
        initialEntries: [`${ROUTES.personalServer}?personalServerScenario=ui-auth-error`],
      }
    )

    render(
      <TooltipProvider delayDuration={120}>
        <Provider store={store}>
          <RouterProvider router={router} />
        </Provider>
      </TooltipProvider>
    )

    await waitFor(() => {
      expect(screen.getByText("Failed to bind server port")).toBeTruthy()
    })
    expect(screen.getByRole("button", { name: "Retry start" })).toBeTruthy()
  })

  it("falls back to real auth state for invalid debug scenario", () => {
    const router = createMemoryRouter(
      [{ path: ROUTES.personalServer, element: <PersonalServer /> }],
      {
        initialEntries: [
          `${ROUTES.personalServer}?personalServerScenario=not-a-scenario`,
        ],
      }
    )

    render(
      <TooltipProvider delayDuration={120}>
        <Provider store={store}>
          <RouterProvider router={router} />
        </Provider>
      </TooltipProvider>
    )

    expect(screen.getByRole("button", { name: "Sign in to start" })).toBeTruthy()
    expect(screen.queryByText("Public endpoint")).toBeNull()
  })

  it("renders signed-out UI when debug scenario forces signed out", () => {
    const router = createMemoryRouter(
      [{ path: ROUTES.personalServer, element: <PersonalServer /> }],
      {
        initialEntries: [
          `${ROUTES.personalServer}?personalServerScenario=ui-signed-out`,
        ],
      }
    )

    render(
      <TooltipProvider delayDuration={120}>
        <Provider store={store}>
          <RouterProvider router={router} />
        </Provider>
      </TooltipProvider>
    )

    expect(screen.getByRole("button", { name: "Sign in to start" })).toBeTruthy()
    expect(screen.queryByText("Public endpoint")).toBeNull()
  })

  it("writes and removes debug scenario via panel controls", async () => {
    const router = createMemoryRouter(
      [{ path: ROUTES.personalServer, element: <PersonalServer /> }],
      { initialEntries: [ROUTES.personalServer] }
    )

    render(
      <TooltipProvider delayDuration={120}>
        <Provider store={store}>
          <RouterProvider router={router} />
        </Provider>
      </TooltipProvider>
    )

    fireEvent.click(screen.getByRole("button", { name: "Personal Server debug" }))
    fireEvent.click(screen.getByRole("button", { name: "ui-auth-running" }))

    await waitFor(() => {
      expect(router.state.location.search).toBe(
        "?personalServerScenario=ui-auth-running"
      )
    })
    expect(screen.queryByRole("button", { name: "Sign in to start" })).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "real" }))
    await waitFor(() => {
      expect(router.state.location.search).toBe("")
    })
    expect(screen.getByRole("button", { name: "Sign in to start" })).toBeTruthy()
  })

})
