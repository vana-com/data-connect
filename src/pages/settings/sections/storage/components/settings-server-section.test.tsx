import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { SettingsServerSection } from "./settings-server-section"

const ACTIVE_SERVER_OPTION_KEY = "settings.active-server-option"

function renderServerSection() {
  const personalServer = {
    status: "running" as const,
    port: 7777,
    tunnelUrl: "https://real.server.vana.org",
    devToken: null,
    error: null,
    startServer: vi.fn(),
    stopServer: vi.fn(),
    restartServer: vi.fn(),
    restartingRef: { current: false },
  }

  return render(
    <TooltipProvider delayDuration={120}>
      <SettingsServerSection
        isAuthenticated
        accountEmail="real-user@vana.org"
        walletAddress="0xabcdefabcdefabcdefabcdefabcdefabcdef1234"
        onSignIn={vi.fn()}
        personalServer={personalServer}
      />
    </TooltipProvider>
  )
}

describe("SettingsServerSection", () => {
  afterEach(() => {
    cleanup()
    window.localStorage.removeItem(ACTIVE_SERVER_OPTION_KEY)
  })

  it.fails("uses real personal-server values instead of preview constants", () => {
    window.localStorage.setItem(ACTIVE_SERVER_OPTION_KEY, "personal-server")

    renderServerSection()

    expect(screen.getByText("Running on port 7777")).toBeTruthy()
    expect(screen.getByText("https://real.server.vana.org")).toBeTruthy()
    expect(screen.getByText("real-user@vana.org")).toBeTruthy()
  })

  it("expands personal server rows when selected", () => {
    window.localStorage.removeItem(ACTIVE_SERVER_OPTION_KEY)

    renderServerSection()
    fireEvent.click(screen.getByRole("radio", { name: /Personal Server/ }))

    expect(screen.getByText("Server status")).toBeTruthy()
    expect(screen.getByText("Public endpoint")).toBeTruthy()
    expect(screen.getByText("Authorisation")).toBeTruthy()
  })
})
