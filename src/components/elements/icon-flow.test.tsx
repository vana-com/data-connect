import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { IconFlow } from "./icon-flow"

describe("IconFlow", () => {
  it("renders from and to content with the directional arrow", () => {
    const { container } = render(
      <IconFlow
        from={<span data-testid="from-icon">From</span>}
        to={<span data-testid="to-icon">To</span>}
      />
    )

    expect(screen.getByTestId("from-icon")).toBeTruthy()
    expect(screen.getByTestId("to-icon")).toBeTruthy()
    expect(container.querySelector('[data-slot="icon-flow"] svg')).toBeTruthy()
  })
})
