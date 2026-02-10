import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { ROUTES } from "@/config/routes"
import { Connect } from "./index"

const mockUsePlatforms = vi.fn()

vi.mock("@/hooks/usePlatforms", () => ({
  usePlatforms: () => mockUsePlatforms(),
}))

vi.mock("@/hooks/useConnector", () => ({
  useConnector: () => ({
    startExport: vi.fn(),
  }),
}))

vi.mock("react-redux", async () => {
  const actual = await vi.importActual<object>("react-redux")
  return {
    ...actual,
    useSelector: (selector: (state: { app: { runs: [] } }) => unknown) =>
      selector({ app: { runs: [] } }),
  }
})

function renderConnect() {
  const router = createMemoryRouter(
    [{ path: ROUTES.connect, element: <Connect /> }],
    {
      initialEntries: [ROUTES.connect],
    }
  )

  return render(<RouterProvider router={router} />)
}

describe("Connect", () => {
  beforeEach(() => {
    mockUsePlatforms.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it("shows a missing connector message when no platform matches", () => {
    mockUsePlatforms.mockReturnValue({
      platforms: [],
      connectedPlatforms: {},
      loadPlatforms: vi.fn(),
      refreshConnectedStatus: vi.fn(),
      getPlatformById: vi.fn(),
      isPlatformConnected: vi.fn(() => false),
      platformsLoaded: true,
      platformLoadError: null,
    })

    const { getByRole, getByText } = renderConnect()

    expect(getByText(/no connector installed for chatgpt/i)).toBeTruthy()
    const connectButton = getByRole("button", { name: /connect chatgpt/i })
    expect(connectButton.hasAttribute("disabled")).toBe(true)
  })
})
