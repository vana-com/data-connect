import { describe, expect, it, vi } from "vitest"
import { render } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { ROUTES } from "@/config/routes"
import { Runs } from "./index"

vi.mock("react-router", async () => {
  const actual = await vi.importActual<object>("react-router")
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  }
})

vi.mock("./use-runs-page", () => ({
  useRunsPage: () => ({
    finishedRuns: [],
    stopExport: vi.fn(),
    isAuthenticated: false,
    personalServer: {
      status: "stopped",
      port: null,
      error: null,
    },
    serverId: null,
    serverReady: false,
  }),
}))

describe("Runs", () => {
  it("shows the empty state when no runs exist", () => {
    const router = createMemoryRouter([{ path: ROUTES.runs, element: <Runs /> }], {
      initialEntries: [ROUTES.runs],
    })

    const { getByText } = render(<RouterProvider router={router} />)

    expect(getByText("No exports yet")).toBeTruthy()
  })
})
