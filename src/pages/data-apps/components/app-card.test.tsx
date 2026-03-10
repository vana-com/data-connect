import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { AppCard } from "./app-card"

describe("AppCard", () => {
  it("renders a trailing affordance for interactive cards", () => {
    const { container } = render(
      <AppCard onClick={vi.fn()} ariaLabel="Open app">
        <div>Card content</div>
      </AppCard>
    )

    expect(screen.getByRole("button", { name: "Open app" })).toBeTruthy()

    expect(
      container.querySelector('[data-slot="app-card-affordance"]')
    ).toBeTruthy()
  })

  it("does not render the trailing affordance for non-interactive cards", () => {
    const { container } = render(
      <AppCard interactive={false}>
        <div>Card content</div>
      </AppCard>
    )

    expect(container.querySelector("button")).toBeNull()
    expect(
      container.querySelector('[data-slot="app-card-affordance"]')
    ).toBeNull()
  })
})
