import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { usePersonalServer } from "@/hooks/usePersonalServer"
import { TooltipProvider } from "@/components/ui/tooltip"
import { SettingsPersonalServer } from "./settings-personal-server"

const makePersonalServer = (
  overrides: Partial<ReturnType<typeof usePersonalServer>> = {}
) =>
  ({
    status: "stopped",
    port: null,
    tunnelUrl: null,
    tunnelFailed: false,
    devToken: null,
    error: null,
    startServer: vi.fn(),
    stopServer: vi.fn(),
    restartServer: vi.fn(),
    restartingRef: { current: false },
    ...overrides,
  }) as ReturnType<typeof usePersonalServer>

describe("SettingsPersonalServer", () => {
  afterEach(() => {
    cleanup()
  })

  const getLocationRowOpenButton = () => {
    const locationRow = screen
      .getByText("Data location")
      .closest<HTMLElement>('[data-slot="settings-detail-row"]')
    if (!locationRow) {
      throw new Error("Location row not found")
    }

    return within(locationRow).getByRole("button", { name: "Open" })
  }

  it("opens personal server folder from location row", () => {
    const onOpenPersonalServerFolder = vi.fn()

    render(
      <TooltipProvider delayDuration={120}>
        <SettingsPersonalServer
          personalServer={makePersonalServer()}
          onRestartPersonalServer={vi.fn()}
          onStopPersonalServer={vi.fn()}
          onSignInToStart={vi.fn()}
          isAuthenticated={true}
          personalServerDataPath="/Users/test/data-connect/personal-server"
          onOpenPersonalServerFolder={onOpenPersonalServerFolder}
        />
      </TooltipProvider>
    )

    fireEvent.click(getLocationRowOpenButton())
    expect(onOpenPersonalServerFolder).toHaveBeenCalledTimes(1)
  })

  it("disables location open action when personal server path is unavailable", () => {
    render(
      <TooltipProvider delayDuration={120}>
        <SettingsPersonalServer
          personalServer={makePersonalServer()}
          onRestartPersonalServer={vi.fn()}
          onStopPersonalServer={vi.fn()}
          onSignInToStart={vi.fn()}
          isAuthenticated={true}
          personalServerDataPath=""
          onOpenPersonalServerFolder={vi.fn()}
        />
      </TooltipProvider>
    )

    expect((getLocationRowOpenButton() as HTMLButtonElement).disabled).toBe(true)
  })
})
