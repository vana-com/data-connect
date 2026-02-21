import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { LINKS } from "@/config/links"
import { SettingsAbout } from "./settings-about"

describe("SettingsAbout", () => {
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it("shows loading feedback when refreshing browser status", async () => {
    vi.useFakeTimers()
    const onCheckBrowserStatus = vi.fn()

    render(
      <TooltipProvider delayDuration={120}>
        <SettingsAbout
          appVersion="1.2.3"
          logPath="/tmp/logs"
          nodeTestStatus="idle"
          nodeTestResult={null}
          nodeTestError={null}
          browserStatus={{ available: true, browser_type: "system" }}
          pathsDebug={null}
          personalServer={{ status: "stopped", port: null, error: null }}
          simulateNoChrome={false}
          onTestNodeJs={vi.fn()}
          onCheckBrowserStatus={onCheckBrowserStatus}
          onDebugPaths={vi.fn()}
          onClearDebugPaths={vi.fn()}
          onRestartPersonalServer={vi.fn()}
          onStopPersonalServer={vi.fn()}
          onSimulateNoChromeChange={vi.fn()}
          onOpenLogFolder={vi.fn()}
        />
      </TooltipProvider>
    )

    fireEvent.click(screen.getByRole("button", { name: "Refresh" }))

    expect(onCheckBrowserStatus).toHaveBeenCalledTimes(1)
    expect(
      (screen.getByRole("button", { name: "Refreshing…" }) as HTMLButtonElement)
        .disabled
    ).toBe(true)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(700)
    })

    expect(
      (screen.getByRole("button", { name: "Refresh" }) as HTMLButtonElement)
        .disabled
    ).toBe(false)
  })

  it("shows loading state while personal server is starting", () => {
    render(
      <TooltipProvider delayDuration={120}>
        <SettingsAbout
          appVersion="1.2.3"
          logPath="/tmp/logs"
          nodeTestStatus="idle"
          nodeTestResult={null}
          nodeTestError={null}
          browserStatus={{ available: true, browser_type: "system" }}
          pathsDebug={null}
          personalServer={{ status: "starting", port: null, error: null }}
          simulateNoChrome={false}
          onTestNodeJs={vi.fn()}
          onCheckBrowserStatus={vi.fn()}
          onDebugPaths={vi.fn()}
          onClearDebugPaths={vi.fn()}
          onRestartPersonalServer={vi.fn()}
          onStopPersonalServer={vi.fn()}
          onSimulateNoChromeChange={vi.fn()}
          onOpenLogFolder={vi.fn()}
        />
      </TooltipProvider>
    )

    expect(
      (screen.getByRole("button", { name: "Starting…" }) as HTMLButtonElement)
        .disabled
    ).toBe(true)
  })

  it("closes node test success details when close is clicked", () => {
    render(
      <TooltipProvider delayDuration={120}>
        <SettingsAbout
          appVersion="1.2.3"
          logPath="/tmp/logs"
          nodeTestStatus="success"
          nodeTestResult={{
            nodejs: "v22.0.0",
            platform: "darwin",
            arch: "arm64",
            hostname: "mbp.local",
            cpus: 10,
            memory: "16 GB",
            uptime: "12m",
          }}
          nodeTestError={null}
          browserStatus={{ available: true, browser_type: "system" }}
          pathsDebug={null}
          personalServer={{ status: "stopped", port: null, error: null }}
          simulateNoChrome={false}
          onTestNodeJs={vi.fn()}
          onCheckBrowserStatus={vi.fn()}
          onDebugPaths={vi.fn()}
          onClearDebugPaths={vi.fn()}
          onRestartPersonalServer={vi.fn()}
          onStopPersonalServer={vi.fn()}
          onSimulateNoChromeChange={vi.fn()}
          onOpenLogFolder={vi.fn()}
        />
      </TooltipProvider>
    )

    expect(screen.getByText(/Hostname:/)).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Close" }))
    expect(screen.queryByText(/Hostname:/)).toBeNull()
  })

  it("routes both resource links to docs and exposes commit link", () => {
    render(
      <TooltipProvider delayDuration={120}>
        <SettingsAbout
          appVersion="1.2.3"
          logPath="/tmp/logs"
          nodeTestStatus="idle"
          nodeTestResult={null}
          nodeTestError={null}
          browserStatus={{ available: true, browser_type: "system" }}
          pathsDebug={null}
          personalServer={{ status: "stopped", port: null, error: null }}
          simulateNoChrome={false}
          onTestNodeJs={vi.fn()}
          onCheckBrowserStatus={vi.fn()}
          onDebugPaths={vi.fn()}
          onClearDebugPaths={vi.fn()}
          onRestartPersonalServer={vi.fn()}
          onStopPersonalServer={vi.fn()}
          onSimulateNoChromeChange={vi.fn()}
          onOpenLogFolder={vi.fn()}
        />
      </TooltipProvider>
    )

    const resourceLinks = screen.getAllByRole("link", { name: "Open" })
    expect(resourceLinks).toHaveLength(2)
    for (const link of resourceLinks) {
      expect(link.getAttribute("href")).toBe(LINKS.docs)
    }

    const commitLink = screen
      .getAllByRole("link")
      .find(link => link.getAttribute("href")?.includes("/commit/"))
    expect(commitLink).toBeTruthy()
  })
})
