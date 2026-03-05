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

  it("shows only sign-in action while signed out", () => {
    render(
      <TooltipProvider delayDuration={120}>
        <SettingsPersonalServer
          personalServer={makePersonalServer()}
          onRestartPersonalServer={vi.fn()}
          onStopPersonalServer={vi.fn()}
          onSignInToStart={vi.fn()}
          isAuthenticated={false}
          personalServerDataPath="/Users/test/data-connect/personal-server"
          onOpenPersonalServerFolder={vi.fn()}
        />
      </TooltipProvider>
    )

    expect(screen.getByRole("button", { name: "Sign in to start" })).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Open" })).toBeNull()
  })

  it("prevents duplicate sign-in launches on rapid repeat clicks", () => {
    const onSignInToStart = vi.fn(
      () =>
        new Promise<void>(resolve => {
          setTimeout(resolve, 20)
        })
    )

    render(
      <TooltipProvider delayDuration={120}>
        <SettingsPersonalServer
          personalServer={makePersonalServer()}
          onRestartPersonalServer={vi.fn()}
          onStopPersonalServer={vi.fn()}
          onSignInToStart={onSignInToStart}
          isAuthenticated={false}
          personalServerDataPath="/Users/test/data-connect/personal-server"
          onOpenPersonalServerFolder={vi.fn()}
        />
      </TooltipProvider>
    )

    const signInButton = screen.getByRole("button", { name: "Sign in to start" })
    fireEvent.click(signInButton)
    fireEvent.click(signInButton)

    expect(onSignInToStart).toHaveBeenCalledTimes(1)
  })

  it("shows recovery action when authenticated but server is stopped", () => {
    render(
      <TooltipProvider delayDuration={120}>
        <SettingsPersonalServer
          personalServer={makePersonalServer({ status: "stopped" })}
          onRestartPersonalServer={vi.fn()}
          onStopPersonalServer={vi.fn()}
          onSignInToStart={vi.fn()}
          isAuthenticated={true}
          personalServerDataPath="/Users/test/data-connect/personal-server"
          onOpenPersonalServerFolder={vi.fn()}
        />
      </TooltipProvider>
    )

    expect(screen.queryByRole("button", { name: "Start" })).toBeNull()
    expect(screen.getByRole("button", { name: "Retry start" })).toBeTruthy()
  })

  it("shows endpoint message for stopped state", () => {
    render(
      <TooltipProvider delayDuration={120}>
        <SettingsPersonalServer
          personalServer={makePersonalServer({ status: "stopped" })}
          onRestartPersonalServer={vi.fn()}
          onStopPersonalServer={vi.fn()}
          onSignInToStart={vi.fn()}
          isAuthenticated={true}
          personalServerDataPath="/Users/test/data-connect/personal-server"
          onOpenPersonalServerFolder={vi.fn()}
        />
      </TooltipProvider>
    )

    expect(screen.getByText("Server is stopped. Endpoint unavailable.")).toBeTruthy()
  })

  it("shows endpoint message for error state", () => {
    render(
      <TooltipProvider delayDuration={120}>
        <SettingsPersonalServer
          personalServer={makePersonalServer({
            status: "error",
            error: "Failed to bind server port",
          })}
          onRestartPersonalServer={vi.fn()}
          onStopPersonalServer={vi.fn()}
          onSignInToStart={vi.fn()}
          isAuthenticated={true}
          personalServerDataPath="/Users/test/data-connect/personal-server"
          onOpenPersonalServerFolder={vi.fn()}
        />
      </TooltipProvider>
    )

    expect(
      screen.getByText("Server failed to start. Retry to regenerate endpoint.")
    ).toBeTruthy()
  })

  it("shows no action control while server is starting", () => {
    render(
      <TooltipProvider delayDuration={120}>
        <SettingsPersonalServer
          personalServer={makePersonalServer({ status: "starting" })}
          onRestartPersonalServer={vi.fn()}
          onStopPersonalServer={vi.fn()}
          onSignInToStart={vi.fn()}
          isAuthenticated={true}
          personalServerDataPath="/Users/test/data-connect/personal-server"
          onOpenPersonalServerFolder={vi.fn()}
        />
      </TooltipProvider>
    )

    expect(screen.queryByRole("button", { name: "Starting…" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Retry start" })).toBeNull()
  })
})
