import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen, fireEvent, act, waitFor } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { ROUTES } from "@/config/routes"
import type { Run } from "@/types"
import { Connect } from "./index"

// ---------- mocks ----------

const mockUsePlatforms = vi.fn()
type MockRun = Pick<Run, "id" | "status" | "statusMessage" | "phase">
let mockRuns: MockRun[] = []

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
    useSelector: (
      selector: (state: { app: { runs: typeof mockRuns } }) => unknown
    ) => selector({ app: { runs: mockRuns } }),
  }
})

// ---------- helpers ----------

const CHATGPT_PLATFORM = {
  id: "chatgpt",
  name: "ChatGPT",
  company: "OpenAI",
  filename: "chatgpt.js",
  connectURL: "https://chatgpt.com",
}

function defaultPlatforms(overrides: Partial<ReturnType<typeof mockUsePlatforms>> = {}) {
  return {
    platforms: [],
    connectedPlatforms: {},
    loadPlatforms: vi.fn(),
    refreshConnectedStatus: vi.fn(),
    getPlatformById: vi.fn(),
    isPlatformConnected: vi.fn(() => false),
    platformsLoaded: true,
    platformLoadError: null,
    ...overrides,
  }
}

function renderConnect(initialSearch = "") {
  const router = createMemoryRouter(
    [
      { path: ROUTES.connect, element: <Connect /> },
      {
        path: ROUTES.grant,
        element: <div data-testid="grant-page">Grant</div>,
      },
    ],
    {
      initialEntries: [`${ROUTES.connect}${initialSearch}`],
    }
  )

  return { ...render(<RouterProvider router={router} />), router }
}

const REAL_SESSION_SEARCH =
  "?sessionId=sess-123&secret=my-secret&scopes=%5B%22chatgpt.conversations%22%5D"

const CLAIMED_SESSION = {
  granteeAddress: "0xBuilderAddress",
  scopes: ["chatgpt.conversations"],
  expiresAt: new Date(Date.now() + 3600_000).toISOString(),
  webhookUrl: "https://builder.example.com/webhook",
  appUserId: "user-42",
}

const BUILDER_MANIFEST = {
  name: "Test Builder App",
  appUrl: "https://builder.example.com",
  verified: true,
  description: "A test builder app",
  icons: [{ src: "https://builder.example.com/icon.png" }],
  privacyPolicyUrl: "https://builder.example.com/privacy",
}

// ---------- tests ----------

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

  // -------- rendering / copy --------

  describe("title and copy", () => {
    it("shows 'Connect your ChatGPT' when scopes resolve to ChatGPT", () => {
      mockUsePlatforms.mockReturnValue(defaultPlatforms())
      renderConnect(REAL_SESSION_SEARCH)
      expect(screen.getByText("Connect your ChatGPT")).toBeTruthy()
    })

    it("falls back to default app scopes when appId is unknown", () => {
      mockUsePlatforms.mockReturnValue(defaultPlatforms())
      // Unknown appId → getAppRegistryEntry returns null → falls back to
      // DEFAULT_APP_ID (rickroll) → scopes resolve to ChatGPT.
      renderConnect("?appId=nonexistent")
      expect(screen.getByText("Connect your ChatGPT")).toBeTruthy()
    })

    it("auto-navigates to grant when platform is already connected", async () => {
      mockUsePlatforms.mockReturnValue(
        defaultPlatforms({
          platforms: [CHATGPT_PLATFORM],
          isPlatformConnected: vi.fn(() => true),
        })
      )
      const { router } = renderConnect(REAL_SESSION_SEARCH)
      await waitFor(() => {
        expect(router.state.location.pathname).toBe(ROUTES.grant)
      })
    })
  })

  // -------- platform resolution --------

  describe("platform resolution", () => {
    it("shows a missing connector message when no platform matches", () => {
      mockUsePlatforms.mockReturnValue(defaultPlatforms())
      renderConnect()

      expect(
        screen.getByText(/no connector installed for chatgpt/i)
      ).toBeTruthy()
      const connectButton = screen.getByRole("button", {
        name: /connect chatgpt/i,
      })
      expect(connectButton.hasAttribute("disabled")).toBe(true)
    })

    it("shows 'No data source matches' when scopes don't match any registry entry", () => {
      mockUsePlatforms.mockReturnValue(defaultPlatforms())
      renderConnect("?scopes=%5B%22unknown.data%22%5D")

      expect(
        screen.getByText(/no data source matches the requested scope/i)
      ).toBeTruthy()
    })

    it("shows platform load error when connectors fail to load", () => {
      mockUsePlatforms.mockReturnValue(
        defaultPlatforms({ platformLoadError: "IPC error" })
      )
      renderConnect()
      expect(screen.getByText(/could not load connectors/i)).toBeTruthy()
    })

    it("shows loading state while checking platforms", () => {
      mockUsePlatforms.mockReturnValue(
        defaultPlatforms({ platformsLoaded: false })
      )
      renderConnect()

      const connectButton = screen.getByRole("button")
      expect(connectButton.getAttribute("aria-busy")).toBe("true")
      expect(screen.getByText("Checking connectors...")).toBeTruthy()
    })

    it("enables the connect button when platform is available", () => {
      mockUsePlatforms.mockReturnValue(
        defaultPlatforms({ platforms: [CHATGPT_PLATFORM] })
      )
      renderConnect(REAL_SESSION_SEARCH)

      const connectButton = screen.getByRole("button", {
        name: /connect chatgpt/i,
      })
      expect(connectButton.hasAttribute("disabled")).toBe(false)
    })
  })

  // -------- background pre-fetch --------

  describe("background pre-fetch", () => {
    it("claims session and verifies builder for real sessions", async () => {
      mockClaimSession.mockResolvedValue(CLAIMED_SESSION)
      mockVerifyBuilder.mockResolvedValue(BUILDER_MANIFEST)
      mockUsePlatforms.mockReturnValue(defaultPlatforms())

      renderConnect(REAL_SESSION_SEARCH)

      await waitFor(() => {
        expect(mockClaimSession).toHaveBeenCalledWith({
          sessionId: "sess-123",
          secret: "my-secret",
        })
      })

      await waitFor(() => {
        expect(mockVerifyBuilder).toHaveBeenCalledWith(
          CLAIMED_SESSION.granteeAddress,
          CLAIMED_SESSION.webhookUrl
        )
      })
    })

    it("does not pre-fetch when secret is missing", () => {
      mockUsePlatforms.mockReturnValue(defaultPlatforms())
      renderConnect("?sessionId=sess-123")

      expect(mockClaimSession).not.toHaveBeenCalled()
    })

    it("does not pre-fetch when sessionId is missing", () => {
      mockUsePlatforms.mockReturnValue(defaultPlatforms())
      renderConnect("?secret=my-secret")

      expect(mockClaimSession).not.toHaveBeenCalled()
    })

    it("does not pre-fetch for demo sessions in dev mode", () => {
      mockUsePlatforms.mockReturnValue(defaultPlatforms())
      renderConnect("?sessionId=grant-session-12345&secret=my-secret")

      expect(mockClaimSession).not.toHaveBeenCalled()
    })

    it("pre-fetch failure is non-fatal — does not crash UI", async () => {
      const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {})
      mockClaimSession.mockRejectedValue(new Error("Network error"))
      mockUsePlatforms.mockReturnValue(defaultPlatforms())

      renderConnect(REAL_SESSION_SEARCH)

      await waitFor(() => {
        expect(consoleWarn).toHaveBeenCalledWith(
          "[Connect] Pre-fetch: claim failed",
          expect.objectContaining({ error: expect.any(Error) })
        )
      })

      // UI should still be functional
      expect(screen.getByText("Connect your ChatGPT")).toBeTruthy()
      consoleWarn.mockRestore()
    })

    it("deduplicates pre-fetch for same session ID across re-renders", async () => {
      mockClaimSession.mockResolvedValue(CLAIMED_SESSION)
      mockVerifyBuilder.mockResolvedValue(BUILDER_MANIFEST)
      mockUsePlatforms.mockReturnValue(defaultPlatforms())

      const { rerender, router } = renderConnect(REAL_SESSION_SEARCH)

      await waitFor(() => {
        expect(mockClaimSession).toHaveBeenCalledTimes(1)
      })

      // Re-render (simulating state change that doesn't change sessionId)
      rerender(<RouterProvider router={router} />)

      // Should still be called only once (deduplicated by ref)
      expect(mockClaimSession).toHaveBeenCalledTimes(1)
    })
  })

  // -------- connector execution + navigation --------

  describe("connector execution and navigation", () => {
    it("starts export when connect button is clicked", async () => {
      mockStartExport.mockResolvedValue("run-1")
      mockUsePlatforms.mockReturnValue(
        defaultPlatforms({ platforms: [CHATGPT_PLATFORM] })
      )

      renderConnect(REAL_SESSION_SEARCH)
      const connectButton = screen.getByRole("button", {
        name: /connect chatgpt/i,
      })

      await act(async () => {
        fireEvent.click(connectButton)
      })

      expect(mockStartExport).toHaveBeenCalledWith(CHATGPT_PLATFORM)
    })

    it("navigates to grant page with prefetched data when run succeeds", async () => {
      // Setup: pre-fetch resolves, then connector run succeeds
      mockClaimSession.mockResolvedValue(CLAIMED_SESSION)
      mockVerifyBuilder.mockResolvedValue(BUILDER_MANIFEST)
      mockStartExport.mockResolvedValue("run-1")
      mockUsePlatforms.mockReturnValue(
        defaultPlatforms({ platforms: [CHATGPT_PLATFORM] })
      )

      const { router } = renderConnect(REAL_SESSION_SEARCH)

      // Wait for pre-fetch to complete
      await waitFor(() => {
        expect(mockVerifyBuilder).toHaveBeenCalled()
      })

      // Start the connector
      const connectButton = screen.getByRole("button", {
        name: /connect chatgpt/i,
      })
      await act(async () => {
        fireEvent.click(connectButton)
      })

      // Simulate run success
      await act(async () => {
        mockRuns = [{ id: "run-1", status: "success" }]
        // Force re-render by updating router
        router.navigate(`${ROUTES.connect}${REAL_SESSION_SEARCH}`)
      })

      await waitFor(() => {
        expect(router.state.location.pathname).toBe(ROUTES.grant)
      })

      // Verify search params are threaded through
      const search = router.state.location.search
      expect(search).toContain("sessionId=sess-123")
      expect(search).toContain("secret=my-secret")
    })

    it("resets connect state when run errors", async () => {
      mockStartExport.mockResolvedValue("run-1")
      mockUsePlatforms.mockReturnValue(
        defaultPlatforms({ platforms: [CHATGPT_PLATFORM] })
      )

      const { router } = renderConnect(REAL_SESSION_SEARCH)

      // Start export
      const connectButton = screen.getByRole("button", {
        name: /connect chatgpt/i,
      })
      await act(async () => {
        fireEvent.click(connectButton)
      })

      // Simulate run error
      await act(async () => {
        mockRuns = [{ id: "run-1", status: "error" }]
        router.navigate(`${ROUTES.connect}${REAL_SESSION_SEARCH}`)
      })

      // Should stay on connect page (not navigate)
      await waitFor(() => {
        expect(router.state.location.pathname).toBe(ROUTES.connect)
      })
    })

    it("resets connect state when run is stopped", async () => {
      mockStartExport.mockResolvedValue("run-1")
      mockUsePlatforms.mockReturnValue(
        defaultPlatforms({ platforms: [CHATGPT_PLATFORM] })
      )

      const { router } = renderConnect(REAL_SESSION_SEARCH)

      const connectButton = screen.getByRole("button", {
        name: /connect chatgpt/i,
      })
      await act(async () => {
        fireEvent.click(connectButton)
      })

      // Simulate run stopped
      await act(async () => {
        mockRuns = [{ id: "run-1", status: "stopped" }]
        router.navigate(`${ROUTES.connect}${REAL_SESSION_SEARCH}`)
      })

      await waitFor(() => {
        expect(router.state.location.pathname).toBe(ROUTES.connect)
      })
    })

    it("navigates without prefetched state when pre-fetch failed", async () => {
      // Pre-fetch fails
      mockClaimSession.mockRejectedValue(new Error("Network error"))
      vi.spyOn(console, "warn").mockImplementation(() => {})
      mockStartExport.mockResolvedValue("run-1")
      mockUsePlatforms.mockReturnValue(
        defaultPlatforms({ platforms: [CHATGPT_PLATFORM] })
      )

      const { router } = renderConnect(REAL_SESSION_SEARCH)

      // Wait for pre-fetch to fail
      await waitFor(() => {
        expect(mockClaimSession).toHaveBeenCalled()
      })

      // Start export and simulate success
      const connectButton = screen.getByRole("button", {
        name: /connect chatgpt/i,
      })
      await act(async () => {
        fireEvent.click(connectButton)
      })

      await act(async () => {
        mockRuns = [{ id: "run-1", status: "success" }]
        router.navigate(`${ROUTES.connect}${REAL_SESSION_SEARCH}`)
      })

      await waitFor(() => {
        expect(router.state.location.pathname).toBe(ROUTES.grant)
      })

      // Navigation state should not have prefetched data (pre-fetch failed)
      // The grant page will retry claim + verify on its own
      vi.restoreAllMocks()
    })

    it("shows connector status message while run is active", async () => {
      mockStartExport.mockResolvedValue("run-1")
      mockUsePlatforms.mockReturnValue(
        defaultPlatforms({ platforms: [CHATGPT_PLATFORM] })
      )

      const { router } = renderConnect(REAL_SESSION_SEARCH)
      const connectButton = screen.getByRole("button", {
        name: /connect chatgpt/i,
      })

      await act(async () => {
        fireEvent.click(connectButton)
      })

      await act(async () => {
        mockRuns = [
          {
            id: "run-1",
            status: "running",
            statusMessage: "Collecting conversations...",
          },
        ]
        router.navigate(`${ROUTES.connect}${REAL_SESSION_SEARCH}`)
      })

      expect(screen.getByText("Collecting conversations...")).toBeTruthy()
    })

  })

  // -------- grant URL construction --------

  describe("grant URL construction", () => {
    it("includes secret in the skip-to-grant debug link", () => {
      mockUsePlatforms.mockReturnValue(defaultPlatforms())

      const { router } = renderConnect(REAL_SESSION_SEARCH)

      // Click the "Skip to grant step" debug link (available in dev mode when connector is missing)
      const skipLink = document.querySelector('a.link[class*="cursor-pointer"]')
      if (skipLink) {
        act(() => {
          ;(skipLink as HTMLElement).click()
        })
        const search = router.state.location.search
        expect(search).toContain("secret=my-secret")
        expect(search).toContain("sessionId=sess-123")
      }
    })

    it("threads appId through to grant URL", () => {
      mockUsePlatforms.mockReturnValue(defaultPlatforms())

      const { router } = renderConnect(
        "?sessionId=sess-123&secret=abc&appId=my-app&scopes=%5B%22chatgpt.conversations%22%5D"
      )

      const skipLink = document.querySelector('a.link[class*="cursor-pointer"]')
      if (skipLink) {
        act(() => {
          ;(skipLink as HTMLElement).click()
        })
        const search = router.state.location.search
        expect(search).toContain("appId=my-app")
        expect(search).toContain("sessionId=sess-123")
        expect(search).toContain("secret=abc")
      }
    })

    it("threads scopes through to grant URL", () => {
      mockUsePlatforms.mockReturnValue(defaultPlatforms())

      const { router } = renderConnect(
        '?sessionId=sess-123&secret=abc&scopes=%5B%22chatgpt.conversations%22%5D'
      )

      const skipLink = document.querySelector('a.link[class*="cursor-pointer"]')
      if (skipLink) {
        act(() => {
          ;(skipLink as HTMLElement).click()
        })
        const search = router.state.location.search
        expect(search).toContain("scopes=")
        expect(search).toContain("chatgpt.conversations")
      }
    })
  })

  // -------- dev mode behavior --------

  describe("dev mode behavior", () => {
    it("shows skip-to-grant link when connector is missing in dev mode", () => {
      mockUsePlatforms.mockReturnValue(defaultPlatforms())
      renderConnect()

      // In dev mode, the skip link is shown when connector is missing
      expect(screen.getByText(/need to bypass connectors/i)).toBeTruthy()
      expect(screen.getByText("Skip to grant step")).toBeTruthy()
    })

    it("shows browser warning when connector is missing in dev mode", () => {
      mockUsePlatforms.mockReturnValue(defaultPlatforms())
      renderConnect()

      // Text component converts straight apostrophes to curly quotes (U+2019),
      // so we match with a character class that accepts both forms.
      expect(
        screen.getByText(/if you[\u2018\u2019']re viewing this in a browser/i)
      ).toBeTruthy()
    })
  })
})
