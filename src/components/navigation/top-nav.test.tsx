import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { MemoryRouter } from "react-router-dom"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ROUTES } from "@/config/routes"
import { TopNav } from "./top-nav"

function renderTopNav(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <TooltipProvider delayDuration={0}>
        <TopNav personalServerStatus="running" />
      </TooltipProvider>
    </MemoryRouter>
  )
}

describe("TopNav", () => {
  it("marks the server item active on the personal server route", () => {
    renderTopNav(ROUTES.personalServer)

    expect(screen.getByRole("link", { name: "Server" }).getAttribute("aria-current")).toBe(
      "page"
    )
  })
})
