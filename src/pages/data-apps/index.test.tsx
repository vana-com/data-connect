import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { getAppRegistryEntries } from "@/apps/registry"
import { LINKS } from "@/config/links"
import { DataApps } from "./index"

const renderDataApps = () => {
  const router = createMemoryRouter(
    [{ path: "/apps", element: <DataApps /> }],
    {
      initialEntries: ["/apps"],
    }
  )

  return render(<RouterProvider router={router} />)
}

describe("DataApps", () => {
  it("renders the page shell and app cards", () => {
    const { container } = renderDataApps()
    const apps = getAppRegistryEntries()
    const liveApps = apps.filter(app => app.status === "live")

    expect(screen.getAllByRole("heading", { level: 1 }).length).toBe(1)
    expect(screen.getAllByRole("heading", { level: 3 }).length).toBe(apps.length)
    expect(
      container.querySelectorAll('button[data-slot="app-card"]').length
    ).toBe(liveApps.length)
  })

  it("wires page links to the configured docs targets", () => {
    const { container } = renderDataApps()

    expect(
      container.querySelectorAll(`a[href="${LINKS.vanaDocsProtocol}"]`).length
    ).toBe(1)
    expect(
      container.querySelectorAll(`a[href="${LINKS.appBuilderExample}"]`).length
    ).toBe(1)
    expect(
      container.querySelectorAll(`a[href="${LINKS.appSubmissionGuide}"]`).length
    ).toBe(1)
  })
})
