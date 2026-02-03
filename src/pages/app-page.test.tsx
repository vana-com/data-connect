import { useEffect } from "react"
import { describe, expect, it } from "vitest"
import { render, waitFor } from "@testing-library/react"
import { createMemoryRouter, RouterProvider, useLocation } from "react-router-dom"
import { ROUTES } from "@/config/routes"
import { AppPage } from "./app-page"

function LocationProbe({ onChange }: { onChange: (pathname: string) => void }) {
  const location = useLocation()

  useEffect(() => {
    onChange(location.pathname)
  }, [location, onChange])

  return null
}

describe("AppPage", () => {
  it("redirects unknown apps to the default app", async () => {
    let latestPathname = ""

    const router = createMemoryRouter(
      [
        {
          path: ROUTES.appRoute,
          element: (
            <>
              <LocationProbe onChange={pathname => (latestPathname = pathname)} />
              <AppPage />
            </>
          ),
        },
      ],
      {
        initialEntries: [ROUTES.app("unknown")],
      }
    )

    render(<RouterProvider router={router} />)

    await waitFor(() => {
      expect(latestPathname).toBe(ROUTES.app("rickroll"))
    })
  })
})
