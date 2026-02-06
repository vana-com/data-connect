import { describe, expect, it, beforeEach, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { open } from "@tauri-apps/plugin-shell"
import { buildGrantSearchParams } from "@/lib/grant-params"
import { getAppRegistryEntries } from "@/apps/registry"
import { ROUTES } from "@/config/routes"
import { DEV_FLAGS } from "@/config/dev-flags"
import { DataApps } from "./index"

const mockNavigate = vi.fn()
const apps = getAppRegistryEntries()
const liveApps = apps.filter(app => app.status === "live")
const comingSoonApps = apps.filter(app => app.status === "coming-soon")
const mutableFlags = DEV_FLAGS as {
  useRickrollMock: boolean
  useTestData: boolean
}
const originalFlags = { ...mutableFlags }

vi.mock("@tauri-apps/plugin-shell", () => ({
  open: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("react-router", async () => {
  const actual = await vi.importActual<object>("react-router")
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const renderDataApps = () => {
  const router = createMemoryRouter(
    [{ path: ROUTES.apps, element: <DataApps /> }],
    {
      initialEntries: [ROUTES.apps],
    }
  )

  return render(<RouterProvider router={router} />)
}

beforeEach(() => {
  vi.clearAllMocks()
  Object.assign(mutableFlags, originalFlags)
})

describe("DataApps", () => {
  it("renders the page title and description", () => {
    renderDataApps()

    expect(
      screen.getByRole("heading", { level: 1, name: "Data Apps" })
    ).toBeTruthy()
    expect(
      screen.getByText(/Create apps with the Vana Data Protocol/i)
    ).toBeTruthy()
  })

  it("renders live apps with Open App button", () => {
    renderDataApps()

    // Use getAllBy* because StrictMode may render twice
    expect(screen.getAllByText("RickRoll Facts").length).toBeGreaterThanOrEqual(
      1
    )
    const openAppButtons = screen.getAllByRole("button", { name: "Open App" })
    expect(openAppButtons.length).toBeGreaterThanOrEqual(liveApps.length)
    openAppButtons.forEach(button => {
      expect(button).toHaveProperty("disabled", false)
    })
  })

  it("renders coming soon apps with disabled Connect buttons", () => {
    renderDataApps()

    expect(screen.getAllByText("Vana Trainer").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Data Marketplace").length).toBeGreaterThan(0)

    const connectButtons = screen.getAllByRole("button", { name: "Connect" })
    expect(connectButtons.length).toBeGreaterThanOrEqual(comingSoonApps.length)
    connectButtons.forEach(button => {
      expect(button).toHaveProperty("disabled", true)
    })
  })

  it("renders the learn more documentation link", () => {
    renderDataApps()

    const learnMoreLinks = screen.getAllByRole("link", { name: /Learn more/i })
    expect(learnMoreLinks.length).toBeGreaterThan(0)
    learnMoreLinks.forEach(link => {
      expect(link.getAttribute("href")).toBe("https://docs.vana.org")
    })
  })

  it("uses the rickroll mock when the flag is enabled", async () => {
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(123)
    mutableFlags.useRickrollMock = true
    renderDataApps()

    const openAppButtons = screen.getAllByRole("button", { name: "Open App" })
    fireEvent.click(openAppButtons[0])

    const appId = liveApps[0].id
    const searchParams = buildGrantSearchParams({
      sessionId: "grant-session-123",
      appId,
      scopes: liveApps[0].scopes,
    })
    const expectedUrl = new URL(ROUTES.rickrollMockRoot, window.location.origin)
    const search = searchParams.toString()
    if (search) {
      expectedUrl.search = search
    }

    const mockOpen = vi.mocked(open)
    await waitFor(() => {
      expect(mockOpen).toHaveBeenCalledWith(expectedUrl.toString())
    })
    nowSpy.mockRestore()
  })

  it("uses the external app URL when the flag is disabled", async () => {
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(123)
    mutableFlags.useRickrollMock = false
    renderDataApps()

    const openAppButtons = screen.getAllByRole("button", { name: "Open App" })
    fireEvent.click(openAppButtons[0])

    const appId = liveApps[0].id
    const searchParams = buildGrantSearchParams({
      sessionId: "grant-session-123",
      appId,
      scopes: liveApps[0].scopes,
    })
    const expectedUrl = new URL(liveApps[0].externalUrl, window.location.origin)
    const search = searchParams.toString()
    if (search) {
      expectedUrl.search = search
    }

    const mockOpen = vi.mocked(open)
    await waitFor(() => {
      expect(mockOpen).toHaveBeenCalledWith(expectedUrl.toString())
    })
    nowSpy.mockRestore()
  })
})
