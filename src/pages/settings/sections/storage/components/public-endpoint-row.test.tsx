import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { PublicEndpointRow } from "./public-endpoint-row"

describe("PublicEndpointRow", () => {
  afterEach(() => {
    cleanup()
  })

  it("does not show copied feedback when copy fails", async () => {
    const onCopy = vi.fn(async () => false)

    render(
      <TooltipProvider delayDuration={120}>
        <PublicEndpointRow
          tunnelUrl="https://real.server.vana.org"
          copied={false}
          onCopy={onCopy}
        />
      </TooltipProvider>
    )

    fireEvent.click(screen.getByRole("button", { name: /Copy URL/ }))

    await waitFor(() => {
      expect(onCopy).toHaveBeenCalledTimes(1)
    })
    expect(screen.queryByText("Copied to clipboard")).toBeNull()
  })

  it("shows copied feedback when copy succeeds", async () => {
    const onCopy = vi.fn(async () => true)

    render(
      <TooltipProvider delayDuration={120}>
        <PublicEndpointRow
          tunnelUrl="https://real.server.vana.org"
          copied={false}
          onCopy={onCopy}
        />
      </TooltipProvider>
    )

    fireEvent.click(screen.getByRole("button", { name: /Copy URL/ }))

    await waitFor(() => {
      expect(screen.getByText("Copied to clipboard")).toBeTruthy()
    })
  })
})
