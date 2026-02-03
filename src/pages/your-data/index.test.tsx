import { describe, expect, it, beforeEach, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { Provider } from "react-redux"
import { configureStore } from "@reduxjs/toolkit"
import { YourData } from "./index"

const mockNavigate = vi.fn()
const mockUsePlatforms = vi.fn()

vi.mock("react-router", async () => {
  const actual = await vi.importActual<object>("react-router")
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock("@/hooks/usePlatforms", () => ({
  usePlatforms: () => mockUsePlatforms(),
}))

const createMockStore = (connectedPlatforms: Record<string, boolean> = {}) =>
  configureStore({
    reducer: {
      app: () => ({ connectedPlatforms }),
    },
  })

const renderYourData = (connectedPlatforms: Record<string, boolean> = {}) => {
  const store = createMockStore(connectedPlatforms)
  const router = createMemoryRouter([{ path: "/", element: <YourData /> }], {
    initialEntries: ["/"],
  })

  return render(
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUsePlatforms.mockReturnValue({
    platforms: [
      { id: "chatgpt", name: "ChatGPT" },
      { id: "twitter", name: "Twitter" },
      { id: "reddit", name: "Reddit" },
    ],
    loading: false,
    error: null,
  })
})

describe("YourData", () => {
  it("renders the page title and description", () => {
    renderYourData()

    expect(screen.getByRole("heading", { level: 1, name: "Your Data" })).toBeTruthy()
    expect(screen.getByText("Manage your connected data sources and applications")).toBeTruthy()
  })

  it("renders tabs for switching views", () => {
    renderYourData()

    // Use getAllBy* because StrictMode may render twice
    const dataTabs = screen.getAllByRole("button", { name: "Your data" })
    const appsTabs = screen.getAllByRole("button", { name: "Connected apps" })
    expect(dataTabs.length).toBeGreaterThan(0)
    expect(appsTabs.length).toBeGreaterThan(0)
    dataTabs.forEach(button => {
      expect(button).toHaveProperty("disabled", false)
    })
    appsTabs.forEach(button => {
      expect(button).toHaveProperty("disabled", false)
    })
  })

  it("switches to Connected apps tab when clicked", () => {
    renderYourData()

    const appsTabs = screen.getAllByRole("button", { name: "Connected apps" })
    fireEvent.click(appsTabs[0])

    expect(screen.getAllByText("No connected apps yet").length).toBeGreaterThan(0)
    const learnMoreLinks = screen.getAllByRole("link", { name: "Learn more" })
    expect(learnMoreLinks.length).toBeGreaterThan(0)
    learnMoreLinks.forEach(link => {
      expect(link.getAttribute("href")).toBe("https://docs.vana.org")
    })
  })

  it("shows available sources when none are connected", () => {
    renderYourData()

    expect(screen.getAllByText("Connect your data sources").length).toBeGreaterThan(0)
    expect(screen.getAllByText("ChatGPT").length).toBeGreaterThan(0)
    expect(screen.queryByText("Connected sources")).toBeNull()
  })

  it("shows connected sources section when platforms are connected", () => {
    renderYourData({ chatgpt: true })

    expect(screen.getAllByText("Connected sources").length).toBeGreaterThan(0)
    expect(screen.getAllByText("ChatGPT").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Add more sources").length).toBeGreaterThan(0)
  })

  it("navigates to home with platform param when connecting a source", () => {
    renderYourData()

    const chatgptButtons = screen.getAllByRole("button", { name: /ChatGPT/i })
    expect(chatgptButtons.length).toBeGreaterThan(0)
    fireEvent.click(chatgptButtons[0])

    expect(mockNavigate).toHaveBeenCalledWith("/?platform=chatgpt")
  })

  it("navigates to runs page when clicking View on connected source", () => {
    renderYourData({ chatgpt: true })

    // Get the first View button (in connected sources section)
    const viewButtons = screen.getAllByRole("button", { name: "View" })
    expect(viewButtons.length).toBeGreaterThan(0)
    fireEvent.click(viewButtons[0])

    expect(mockNavigate).toHaveBeenCalledWith("/runs")
  })
})
