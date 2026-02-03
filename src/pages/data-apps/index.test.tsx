import { describe, expect, it, beforeEach, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { ROUTES } from "@/config/routes"
import { DataApps } from "./index"
import { mockApps } from "./fixtures"

const mockNavigate = vi.fn()
const liveApps = mockApps.filter(app => app.status === "live")
const comingSoonApps = mockApps.filter(app => app.status === "coming-soon")

vi.mock("react-router", async () => {
  const actual = await vi.importActual<object>("react-router")
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const renderDataApps = () => {
  const router = createMemoryRouter([{ path: ROUTES.apps, element: <DataApps /> }], {
    initialEntries: [ROUTES.apps],
  })

  return render(<RouterProvider router={router} />)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("DataApps", () => {
  it("renders the page title and description", () => {
    renderDataApps()

    expect(screen.getByRole("heading", { level: 1, name: "Data Apps" })).toBeTruthy()
    expect(
      screen.getByText("Discover applications that can work with your data")
    ).toBeTruthy()
  })

  it("renders live apps with Open App button", () => {
    renderDataApps()

    // Use getAllBy* because StrictMode may render twice
    expect(screen.getAllByText("RickRoll Facts").length).toBeGreaterThanOrEqual(1)
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

  it("renders the build your own section with documentation link", () => {
    renderDataApps()

    expect(screen.getAllByText("Build your own data app").length).toBeGreaterThan(0)
    const docLinks = screen.getAllByRole("link", { name: /View Documentation/i })
    expect(docLinks.length).toBeGreaterThan(0)
    docLinks.forEach(link => {
      expect(link.getAttribute("href")).toBe("https://docs.vana.org")
    })
  })

  it("navigates to app page when clicking Open App on live app", () => {
    renderDataApps()

    const openAppButtons = screen.getAllByRole("button", { name: "Open App" })
    fireEvent.click(openAppButtons[0])

    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.app(liveApps[0].id))
  })
})
