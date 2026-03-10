import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { getAppRegistryEntries } from "@/apps/registry"
import { TooltipProvider } from "@/components/ui/tooltip"
import { LINKS } from "@/config/links"
import { DataApps } from "./index"

const mockFetchConnectedApps = vi.fn()
let mockConnectedApps = [
  {
    id: "test-connected-app",
    name: "Test Connected App",
    permissions: ["Read"],
    connectedAt: "2026-03-06T12:00:00.000Z",
    externalUrl: "https://example.com",
  },
]

vi.mock("@/hooks/useConnectedApps", () => ({
  useConnectedApps: () => ({
    connectedApps: mockConnectedApps,
    fetchConnectedApps: mockFetchConnectedApps,
    removeApp: vi.fn(),
  }),
}))

vi.mock("@/hooks/usePersonalServer", () => ({
  usePersonalServer: () => ({
    status: "running",
    port: 4319,
    devToken: "dev-token",
    tunnelUrl: null,
    error: null,
    startServer: vi.fn(),
    stopServer: vi.fn(),
    restartServer: vi.fn(),
    restartingRef: { current: false },
  }),
}))

const renderDataApps = (initialEntry = "/apps") => {
  const router = createMemoryRouter(
    [{ path: "/apps", element: <DataApps /> }],
    {
      initialEntries: [initialEntry],
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

describe("DataApps", () => {
  beforeEach(() => {
    mockFetchConnectedApps.mockReset()
    mockConnectedApps = [
      {
        id: "test-connected-app",
        name: "Test Connected App",
        permissions: ["Read"],
        connectedAt: "2026-03-06T12:00:00.000Z",
        externalUrl: "https://example.com",
      },
    ]
  })

  afterEach(() => {
    cleanup()
  })

  it("defaults to discover and renders the app grid", () => {
    const { container } = renderDataApps()
    const apps = getAppRegistryEntries()
    const liveApps = apps.filter(app => app.status === "live")

    expect(screen.getAllByRole("heading", { level: 1 }).length).toBe(1)
    expect(screen.getAllByRole("heading", { level: 3 }).length).toBe(apps.length)
    expect(
      container.querySelectorAll('button[data-slot="app-card"]').length
    ).toBe(liveApps.length)
    expect(mockFetchConnectedApps).not.toHaveBeenCalled()
  })

  it("wires page links to the configured docs targets", () => {
    const { container } = renderDataApps()

    expect(
      container.querySelectorAll(`a[href="${LINKS.vanaDocsProtocol}"]`).length
    ).toBe(1)
    expect(
      container.querySelectorAll(`a[href="${LINKS.appBuilderExample}"]`).length
    ).toBe(1)
    expect(
      container.querySelectorAll(`a[href="${LINKS.appSubmissionGuide}"]`).length
    ).toBe(1)
  })

  it("renders connected apps on first render for /apps?tab=connected", async () => {
    const { container } = renderDataApps("/apps?tab=connected")

    expect(
      screen.getByRole("tab", { name: /connected apps/i }).getAttribute(
        "aria-selected"
      )
    ).toBe("true")
    expect(
      container.querySelector('[data-component="connected-apps-list"]')
    ).toBeTruthy()
    expect(container.querySelector('[data-slot="source-row-list"]')).toBeTruthy()
    expect(screen.getByText("Test Connected App")).toBeTruthy()

    await waitFor(() => {
      expect(mockFetchConnectedApps).toHaveBeenCalledWith(4319, "dev-token")
    })
  })

  it("shows loading instead of the empty state while connected apps are loading", () => {
    mockConnectedApps = []
    mockFetchConnectedApps.mockImplementation(() => new Promise(() => {}))

    renderDataApps("/apps?tab=connected")

    expect(screen.getByText("Loading…")).toBeTruthy()
    expect(screen.queryByText("No connected apps yet")).toBeNull()
  })

  it("shows the loading state for the connected-apps debug loading scenario", () => {
    mockConnectedApps = []

    renderDataApps("/apps?tab=connected&connectedAppsScenario=loading")

    expect(screen.getByText("Loading…")).toBeTruthy()
    expect(screen.queryByText("No connected apps yet")).toBeNull()
    expect(mockFetchConnectedApps).not.toHaveBeenCalled()
  })

  it("falls back to discover for an invalid tab param and canonicalizes the URL", async () => {
    const { container, router } = renderDataApps("/apps?tab=bogus")
    const apps = getAppRegistryEntries()

    expect(
      screen.getByRole("tab", { name: /discover apps/i }).getAttribute(
        "aria-selected"
      )
    ).toBe("true")
    expect(screen.getAllByRole("heading", { level: 3 }).length).toBe(apps.length)
    expect(
      container.querySelector('[data-component="connected-apps-list"]')
    ).toBeNull()

    await waitFor(() => {
      expect(router.state.location.search).toBe("")
    })
  })

  it("preserves unrelated query params while switching tabs", () => {
    const { router } = renderDataApps("/apps?foo=bar")

    fireEvent.click(screen.getByRole("tab", { name: /connected apps/i }))
    let params = new URLSearchParams(router.state.location.search)
    expect(params.get("foo")).toBe("bar")
    expect(params.get("tab")).toBe("connected")

    fireEvent.click(screen.getByRole("tab", { name: /discover apps/i }))
    params = new URLSearchParams(router.state.location.search)
    expect(params.get("foo")).toBe("bar")
    expect(params.get("tab")).toBeNull()
  })
})
