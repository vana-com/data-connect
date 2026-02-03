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
    expect(screen.getAllByRole("button", { name: "Your data" }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole("button", { name: "Connected apps" }).length).toBeGreaterThan(0)
  })

  it("switches to Connected apps tab when clicked", () => {
    renderYourData()

    const appsTabs = screen.getAllByRole("button", { name: "Connected apps" })
    fireEvent.click(appsTabs[0])

    expect(screen.getAllByText("No connected apps yet").length).toBeGreaterThan(0)
  })

  it("shows available sources when none are connected", () => {
    renderYourData()

    expect(screen.getAllByText("Connect your data sources").length).toBeGreaterThan(0)
    expect(screen.getAllByText("ChatGPT").length).toBeGreaterThan(0)
  })

  it("shows connected sources section when platforms are connected", () => {
    renderYourData({ chatgpt: true })

    expect(screen.getAllByText("Connected sources").length).toBeGreaterThan(0)
    expect(screen.getAllByText("ChatGPT").length).toBeGreaterThan(0)
  })

  it("navigates to home with platform param when connecting a source", () => {
    renderYourData()

    // Click on the first platform card (ChatGPT)
    const chatgptTexts = screen.getAllByText("ChatGPT")
    const chatgptButton = chatgptTexts[0].closest("button")
    if (chatgptButton) {
      fireEvent.click(chatgptButton)
    }

    expect(mockNavigate).toHaveBeenCalledWith("/?platform=chatgpt")
  })

  it("navigates to runs page when clicking View on connected source", () => {
    renderYourData({ chatgpt: true })

    // Get the first View button (in connected sources section)
    const viewButtons = screen.getAllByRole("button", { name: "View" })
    fireEvent.click(viewButtons[0])

    expect(mockNavigate).toHaveBeenCalledWith("/runs")
  })
})
