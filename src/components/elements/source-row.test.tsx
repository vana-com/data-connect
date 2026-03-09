import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { SourceRowList, SourceRowWithActions } from "./source-row"

describe("SourceRowWithActions", () => {
  it("keeps the standalone action surface by default", () => {
    const { container } = render(
      <SourceRowWithActions
        iconName="chatgpt"
        label="ChatGPT"
        meta="Monday 9 Mar"
        rowAction={{ ariaLabel: "Open ChatGPT" }}
      />
    )

    expect(screen.getAllByRole("button", { name: "Open ChatGPT" })).toHaveLength(2)
    expect(
      container
        .querySelector('[data-slot="action-button-group"]')
        ?.className.includes("rounded-card")
    ).toBe(true)
  })

  it("renders list items without the standalone card shell", () => {
    const { container } = render(
      <SourceRowList>
        <SourceRowWithActions
          iconName="chatgpt"
          label="ChatGPT"
          rowAction={{ ariaLabel: "Open ChatGPT" }}
          surface="list-item"
        />
        <SourceRowWithActions
          iconName="shop"
          label="Shop"
          rowAction={{ ariaLabel: "Open Shop" }}
          surface="list-item"
        />
      </SourceRowList>
    )

    expect(container.querySelector('[data-slot="source-row-list"]')).toBeTruthy()
    expect(container.querySelectorAll('[data-slot="source-row-divider"]')).toHaveLength(
      1
    )
    const groups = container.querySelectorAll('[data-slot="action-button-group"]')
    expect(groups).toHaveLength(2)
    groups.forEach(group => {
      expect(group.className.includes("rounded-none")).toBe(true)
    })
  })
})
