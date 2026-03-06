import { describe, expect, it, beforeEach, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { open } from "@tauri-apps/plugin-shell"
import { LINKS } from "@/config/links"
import { DataApps } from "./index"

const mockNavigate = vi.fn()

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
    [{ path: "/apps", element: <DataApps /> }],
    {
      initialEntries: ["/apps"],
    }
  )

  return render(<RouterProvider router={router} />)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("DataApps", () => {
  it("renders the page title and description", () => {
    renderDataApps()

    expect(
      screen.getByRole("heading", { level: 1, name: "Data Apps" })
    ).toBeTruthy()
    expect(screen.getByRole("link", { name: "Vana Data Protocol" })).toBeTruthy()
    expect(screen.getByText(/Already have an app\?/i)).toBeTruthy()
  })

  it("renders app builder placeholder CTA", () => {
    renderDataApps()

    expect(screen.getAllByText("Add your app here").length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText("View Next.js example app").length).toBeGreaterThanOrEqual(1)
    expect(
      screen.getAllByRole("button", { name: "Open Next.js example app" }).length
    ).toBeGreaterThanOrEqual(1)
  })

  it("renders registry-backed app cards", () => {
    renderDataApps()

    expect(screen.getAllByText("Peak Think").length).toBeGreaterThan(0)
    expect(screen.getAllByText("LinkedIn to ReadCV").length).toBeGreaterThan(0)
    expect(screen.queryByText("Vana Trainer")).toBeNull()
    expect(
      screen.getAllByRole("button", { name: "Open Peak Think" }).length
    ).toBeGreaterThan(0)
    expect(
      screen.getAllByRole("button", { name: "Open LinkedIn to ReadCV" }).length
    ).toBeGreaterThan(0)
  })

  it("renders the protocol documentation link", () => {
    renderDataApps()

    const protocolLinks = screen.getAllByRole("link", {
      name: "Vana Data Protocol",
    })
    expect(protocolLinks.length).toBeGreaterThan(0)
    protocolLinks.forEach(link => {
      expect(link.getAttribute("href")).toBe(LINKS.vanaDocsProtocol)
    })
  })

  it("links app submissions to the GitHub guide", () => {
    renderDataApps()

    const submitLinks = screen.getAllByRole("link", {
      name: /submit via github/i,
    })
    expect(submitLinks.length).toBeGreaterThan(0)
    submitLinks.forEach(link => {
      expect(link.getAttribute("href")).toBe(LINKS.appSubmissionGuide)
    })
  })

  it("opens app builder docs when CTA is clicked", async () => {
    renderDataApps()

    fireEvent.click(screen.getAllByRole("button", { name: "Open Next.js example app" })[0])

    const mockOpen = vi.mocked(open)
    await waitFor(() => {
      expect(mockOpen).toHaveBeenCalledWith(LINKS.appBuilderExample)
    })
  })
})
