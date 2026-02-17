import { useEffect } from "react"
import { describe, expect, it, vi, beforeEach, type Mock } from "vitest"
import { render, waitFor } from "@testing-library/react"
import {
  createMemoryRouter,
  RouterProvider,
  useLocation,
} from "react-router-dom"
import { ROUTES } from "@/config/routes"
import { useDeepLink } from "./use-deep-link"

// Mock the Tauri deep-link plugin
vi.mock("@tauri-apps/plugin-deep-link", () => ({
  getCurrent: vi.fn(),
  onOpenUrl: vi.fn(),
}))

function DeepLinkHarness({
  onChange,
}: {
  onChange: (pathname: string, search: string) => void
}) {
  useDeepLink()
  const location = useLocation()

  useEffect(() => {
    onChange(location.pathname, location.search)
  }, [location, onChange])

  return null
}

describe("useDeepLink", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("normalizes deep link params into /connect URL", async () => {
    const deepLink = await import("@tauri-apps/plugin-deep-link")
    ;(deepLink.getCurrent as Mock).mockResolvedValue(null)
    ;(deepLink.onOpenUrl as Mock).mockResolvedValue(() => {})

    let latestPathname = ""
    let latestSearch = ""

    const router = createMemoryRouter(
      [
        {
          path: "*",
          element: (
            <DeepLinkHarness
              onChange={(pathname, search) => {
                latestPathname = pathname
                latestSearch = search
              }}
            />
          ),
        },
      ],
      {
        initialEntries: [
          `${ROUTES.home}?sessionId=grant-session-1&appId=rickroll&scopes=read:a,read:b`,
        ],
      }
    )

    render(<RouterProvider router={router} />)

    await waitFor(() => {
      expect(latestPathname).toBe(ROUTES.connect)
    })

    const searchParams = new URLSearchParams(latestSearch)
    expect(searchParams.get("sessionId")).toBe("grant-session-1")
    expect(searchParams.get("appId")).toBe("rickroll")
    expect(searchParams.get("scopes")).toBe('["read:a","read:b"]')
  })

  it("normalization_is_idempotent", async () => {
    const deepLink = await import("@tauri-apps/plugin-deep-link")
    ;(deepLink.getCurrent as Mock).mockResolvedValue(null)
    ;(deepLink.onOpenUrl as Mock).mockResolvedValue(() => {})

    let latestPathname = ""
    let latestSearch = ""

    const router = createMemoryRouter(
      [
        {
          path: "*",
          element: (
            <DeepLinkHarness
              onChange={(pathname, search) => {
                latestPathname = pathname
                latestSearch = search
              }}
            />
          ),
        },
      ],
      {
        initialEntries: [
          `${ROUTES.home}?appId=rickroll&sessionId=grant-session-1&scopes=read:a,read:b&unknown=ignored`,
        ],
      }
    )

    render(<RouterProvider router={router} />)

    await waitFor(() => {
      expect(latestPathname).toBe(ROUTES.connect)
      expect(latestSearch).toBe(
        "?sessionId=grant-session-1&appId=rickroll&scopes=%5B%22read%3Aa%22%2C%22read%3Ab%22%5D"
      )
    })
  })

  it("does not redirect when already on canonical /grant URL", async () => {
    const deepLink = await import("@tauri-apps/plugin-deep-link")
    ;(deepLink.getCurrent as Mock).mockResolvedValue(null)
    ;(deepLink.onOpenUrl as Mock).mockResolvedValue(() => {})

    let latestPathname = ""
    let latestSearch = ""
    const searchParams = new URLSearchParams({
      sessionId: "grant-session-2",
      appId: "rickroll",
      scopes: JSON.stringify(["read:a"]),
    })

    const router = createMemoryRouter(
      [
        {
          path: "*",
          element: (
            <DeepLinkHarness
              onChange={(pathname, search) => {
                latestPathname = pathname
                latestSearch = search
              }}
            />
          ),
        },
      ],
      {
        initialEntries: [`${ROUTES.grant}?${searchParams.toString()}`],
      }
    )

    render(<RouterProvider router={router} />)

    await waitFor(() => {
      expect(latestPathname).toBe(ROUTES.grant)
    })

    expect(latestSearch).toBe(`?${searchParams.toString()}`)
  })

  it("navigates to /connect when app launched via vana:// deep link", async () => {
    const deepLink = await import("@tauri-apps/plugin-deep-link")
    ;(deepLink.getCurrent as Mock).mockResolvedValue([
      "vana://connect?sessionId=sess-123&secret=sec-abc",
    ])
    ;(deepLink.onOpenUrl as Mock).mockResolvedValue(() => {})

    let latestPathname = ""
    let latestSearch = ""

    const router = createMemoryRouter(
      [
        {
          path: "*",
          element: (
            <DeepLinkHarness
              onChange={(pathname, search) => {
                latestPathname = pathname
                latestSearch = search
              }}
            />
          ),
        },
      ],
      { initialEntries: [ROUTES.home] }
    )

    render(<RouterProvider router={router} />)

    await waitFor(() => {
      expect(latestPathname).toBe(ROUTES.connect)
    })

    const searchParams = new URLSearchParams(latestSearch)
    expect(searchParams.get("sessionId")).toBe("sess-123")
    expect(searchParams.get("secret")).toBe("sec-abc")
  })

  it("handles onOpenUrl callback for deep links while app is running", async () => {
    const deepLink = await import("@tauri-apps/plugin-deep-link")
    ;(deepLink.getCurrent as Mock).mockResolvedValue(null)

    let onOpenUrlCallback: ((urls: string[]) => void) | null = null
    ;(deepLink.onOpenUrl as Mock).mockImplementation(
      (cb: (urls: string[]) => void) => {
        onOpenUrlCallback = cb
        return Promise.resolve(() => {})
      }
    )

    let latestPathname = ""
    let latestSearch = ""

    const router = createMemoryRouter(
      [
        {
          path: "*",
          element: (
            <DeepLinkHarness
              onChange={(pathname, search) => {
                latestPathname = pathname
                latestSearch = search
              }}
            />
          ),
        },
      ],
      { initialEntries: [ROUTES.home] }
    )

    render(<RouterProvider router={router} />)

    // Wait for plugin setup to complete
    await waitFor(() => {
      expect(onOpenUrlCallback).not.toBeNull()
    })

    // Simulate receiving a deep link while app is running
    onOpenUrlCallback!(["vana://connect?sessionId=live-sess&secret=live-sec&scopes=chatgpt.conversations"])

    await waitFor(() => {
      expect(latestPathname).toBe(ROUTES.connect)
    })

    const searchParams = new URLSearchParams(latestSearch)
    expect(searchParams.get("sessionId")).toBe("live-sess")
    expect(searchParams.get("secret")).toBe("live-sec")
    expect(searchParams.get("scopes")).toBe('["chatgpt.conversations"]')
  })

  it("ignores invalid deep link URLs from native plugin", async () => {
    const deepLink = await import("@tauri-apps/plugin-deep-link")
    ;(deepLink.getCurrent as Mock).mockResolvedValue([
      "not-a-valid-url",
      "vana://connect",  // valid URL but no sessionId/appId
    ])
    ;(deepLink.onOpenUrl as Mock).mockResolvedValue(() => {})

    let latestPathname = ""

    const router = createMemoryRouter(
      [
        {
          path: "*",
          element: (
            <DeepLinkHarness
              onChange={(pathname) => {
                latestPathname = pathname
              }}
            />
          ),
        },
      ],
      { initialEntries: [ROUTES.home] }
    )

    render(<RouterProvider router={router} />)

    // Should stay on home — no valid params in the URLs
    await waitFor(() => {
      expect(latestPathname).toBe(ROUTES.home)
    })
  })
})
