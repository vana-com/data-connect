import { useEffect } from "react"
import { describe, expect, it } from "vitest"
import { render, waitFor } from "@testing-library/react"
import { createMemoryRouter, RouterProvider, useLocation } from "react-router-dom"
import { ROUTES } from "@/config/routes"
import { useDeepLink } from "./use-deep-link"

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
  it("normalizes deep link params into /grant URL", async () => {
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
      expect(latestPathname).toBe(ROUTES.grant)
    })

    const searchParams = new URLSearchParams(latestSearch)
    expect(searchParams.get("sessionId")).toBe("grant-session-1")
    expect(searchParams.get("appId")).toBe("rickroll")
    expect(searchParams.get("scopes")).toBe('["read:a","read:b"]')
  })

  it("does not redirect when already on canonical /grant URL", async () => {
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
})
