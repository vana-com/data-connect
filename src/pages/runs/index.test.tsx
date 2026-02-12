import { describe, expect, it } from "vitest"
import { render } from "@testing-library/react"
import { createMemoryRouter, RouterProvider, useLocation } from "react-router-dom"
import { ROUTES } from "@/config/routes"
import { Runs } from "./index"

function LocationHarness() {
  const location = useLocation()
  return (
    <div data-testid="location">
      {location.pathname}
      {location.search}
    </div>
  )
}

describe("Runs", () => {
  const expectSettingsRunsUrl = (value: string | undefined) => {
    expect(value?.startsWith("/settings?")).toBe(true)
    const search = value?.slice(value.indexOf("?") + 1) ?? ""
    const params = new URLSearchParams(search)
    expect(params.get("section")).toBe("runs")
    expect(params.get("source")).toBe("github")
    expect(params.get("foo")).toBeNull()
  }

  it("redirects /runs to /settings?section=runs", async () => {
    const router = createMemoryRouter(
      [
        { path: ROUTES.runs, element: <Runs /> },
        { path: ROUTES.settings, element: <LocationHarness /> },
      ],
      {
        initialEntries: [ROUTES.runs],
      }
    )

    const { findByTestId } = render(<RouterProvider router={router} />)
    const location = await findByTestId("location")
    expect(location.textContent).toBe("/settings?section=runs")
  })

  it("preserves source filter when redirecting from /runs", async () => {
    const router = createMemoryRouter(
      [
        { path: ROUTES.runs, element: <Runs /> },
        { path: ROUTES.settings, element: <LocationHarness /> },
      ],
      {
        initialEntries: [`${ROUTES.runs}?source=github`],
      }
    )

    const { findAllByTestId } = render(<RouterProvider router={router} />)
    const locations = await findAllByTestId("location")
    expectSettingsRunsUrl(locations.at(-1)?.textContent ?? undefined)
  })

  it("drops unknown query params when redirecting from /runs", async () => {
    const router = createMemoryRouter(
      [
        { path: ROUTES.runs, element: <Runs /> },
        { path: ROUTES.settings, element: <LocationHarness /> },
      ],
      {
        initialEntries: [`${ROUTES.runs}?foo=bar&source=github`],
      }
    )

    const { findAllByTestId } = render(<RouterProvider router={router} />)
    const locations = await findAllByTestId("location")
    expectSettingsRunsUrl(locations.at(-1)?.textContent ?? undefined)
  })
})
