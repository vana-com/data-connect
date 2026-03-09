import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { PlatformIconGroup } from "./platform-icon-group"

describe("PlatformIconGroup", () => {
  it("renders visible platform icons and an overflow count", () => {
    const { container } = render(
      <PlatformIconGroup
        items={[
          { iconName: "Alpha" },
          { iconName: "Beta" },
          { iconName: "Gamma" },
          { iconName: "Delta" },
        ]}
        maxVisible={3}
      />
    )

    expect(
      container.querySelectorAll('[data-slot="adaptive-icon"]')
    ).toHaveLength(3)
    expect(screen.getByText("+1")).toBeTruthy()
    const adaptiveIcons = container.querySelectorAll(
      '[data-slot="adaptive-icon"]'
    )
    expect(
      Array.from(adaptiveIcons).every(icon =>
        icon.className.includes("ring-background")
      )
    ).toBe(true)
    expect((adaptiveIcons[0] as HTMLElement).className).not.toContain("p-0")
    expect((adaptiveIcons[0] as HTMLElement).className).not.toContain("p-1")
    expect((adaptiveIcons[0] as HTMLElement).className).not.toContain(
      "bg-foreground"
    )
    expect((adaptiveIcons[1] as HTMLElement).style.marginLeft).toBe("-3px")

    const groupChildren = container.querySelector(
      '[data-slot="platform-icon-group"]'
    )?.children
    expect((groupChildren?.[3] as HTMLElement).style.width).toBe("28px")
  })
})
