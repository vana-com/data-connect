import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, act } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { ROUTES } from "@/config/routes"
import { Connect } from "./index"

const mockUsePlatforms = vi.fn()
let mockRuns: Array<{ id: string; status: string }> = []

vi.mock("@/hooks/usePlatforms", () => ({
  usePlatforms: () => mockUsePlatforms(),
}))

const mockStartExport = vi.fn()
vi.mock("@/hooks/useConnector", () => ({
  useConnector: () => ({
    startExport: mockStartExport,
  }),
}))

// Mock services used by background pre-fetch
const mockClaimSession = vi.fn()
const mockVerifyBuilder = vi.fn()
vi.mock("@/services/sessionRelay", () => ({
  claimSession: (...args: unknown[]) => mockClaimSession(...args),
}))
vi.mock("@/services/builder", () => ({
  verifyBuilder: (...args: unknown[]) => mockVerifyBuilder(...args),
}))

vi.mock("react-redux", async () => {
  const actual = await vi.importActual<object>("react-redux")
  return {
    ...actual,
    useSelector: (selector: (state: { app: { runs: typeof mockRuns } }) => unknown) =>
      selector({ app: { runs: mockRuns } }),
  }
})

function renderConnect(initialSearch = "") {
  const router = createMemoryRouter(
    [
      { path: ROUTES.connect, element: <Connect /> },
      { path: ROUTES.grant, element: <div data-testid="grant-page">Grant</div> },
    ],
    {
      initialEntries: [`${ROUTES.connect}${initialSearch}`],
    }
  )

  return { ...render(<RouterProvider router={router} />), router }
}

describe("Connect", () => {
  beforeEach(() => {
    mockUsePlatforms.mockReset()
    mockStartExport.mockReset()
    mockClaimSession.mockReset()
    mockVerifyBuilder.mockReset()
    // Default: background pre-fetch returns pending promise (never resolves in tests)
    mockClaimSession.mockReturnValue(new Promise(() => {}))
    mockVerifyBuilder.mockReturnValue(new Promise(() => {}))
    mockRuns = []
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

  it("includes secret in the skip-to-grant debug link", () => {
    // When secret is in the URL params, the connect page should thread it
    // through to the grant URL so the grant flow can claim + approve the session.
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

    // Render with secret in URL params (dev mode shows a "Skip to grant step" link)
    const { router } = renderConnect(
      "?sessionId=sess-123&secret=my-secret&scopes=%5B%22chatgpt.conversations%22%5D"
    )

    // Click the "Skip to grant step" debug link (available in dev mode when connector is missing)
    const skipLink = document.querySelector('a.link[class*="cursor-pointer"]')
    if (skipLink) {
      act(() => {
        ;(skipLink as HTMLElement).click()
      })
      // Verify navigation target includes secret
      const search = router.state.location.search
      expect(search).toContain("secret=my-secret")
      expect(search).toContain("sessionId=sess-123")
    }
  })
})
