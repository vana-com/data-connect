import { describe, expect, it, vi } from "vitest"
import { render } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { Runs } from "./index"

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
    const router = createMemoryRouter([{ path: "/", element: <Runs /> }], {
      initialEntries: ["/"],
    })

    const { getByText } = render(<RouterProvider router={router} />)

    expect(getByText("No exports yet")).toBeTruthy()
  })
})
