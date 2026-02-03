import { describe, expect, it, beforeEach, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { DataApps } from "./index"

const mockNavigate = vi.fn()

vi.mock("react-router", async () => {
  const actual = await vi.importActual<object>("react-router")
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const renderDataApps = () => {
  const router = createMemoryRouter([{ path: "/", element: <DataApps /> }], {
    initialEntries: ["/"],
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
    expect(screen.getByText("Discover applications that can work with your data")).toBeTruthy()
  })

  it("renders live apps with Open App button", () => {
    renderDataApps()

    // Use getAllBy* because StrictMode may render twice
    expect(screen.getAllByText("RickRoll Facts").length).toBeGreaterThan(0)
    expect(screen.getAllByRole("button", { name: "Open App" }).length).toBeGreaterThan(0)
  })

  it("renders coming soon apps with disabled Connect buttons", () => {
    renderDataApps()

    expect(screen.getAllByText("Vana Trainer").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Data Marketplace").length).toBeGreaterThan(0)

    const connectButtons = screen.getAllByRole("button", { name: "Connect" })
    connectButtons.forEach(button => {
      expect(button).toHaveProperty("disabled", true)
    })
  })

  it("renders the build your own section with documentation link", () => {
    renderDataApps()

    expect(screen.getAllByText("Build your own data app").length).toBeGreaterThan(0)
    const docLinks = screen.getAllByRole("link", { name: /View Documentation/i })
    expect(docLinks.length).toBeGreaterThan(0)
    expect(docLinks[0].getAttribute("href")).toBe("https://docs.vana.org")
  })

  it("navigates to app page when clicking Open App on live app", () => {
    renderDataApps()

    const openAppButtons = screen.getAllByRole("button", { name: "Open App" })
    fireEvent.click(openAppButtons[0])

    expect(mockNavigate).toHaveBeenCalledWith("/apps/rickroll")
  })
})
