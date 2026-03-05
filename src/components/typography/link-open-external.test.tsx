import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { OpenExternalLink } from "./link-open-external"

const openExternalUrlMock = vi.fn()

vi.mock("@/lib/open-resource", () => ({
  openExternalUrl: (...args: unknown[]) => openExternalUrlMock(...args),
}))

const clearTauriGlobals = () => {
  delete (window as unknown as Record<string, unknown>).__TAURI__
  delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__
}

describe("OpenExternalLink", () => {
  beforeEach(() => {
    openExternalUrlMock.mockReset()
    clearTauriGlobals()
  })

  afterEach(() => {
    clearTauriGlobals()
    cleanup()
  })

  it("does not call openExternalUrl in browser runtime", () => {
    render(<OpenExternalLink href="https://docs.vana.org">Docs</OpenExternalLink>)

    fireEvent.click(screen.getByRole("link", { name: "Docs" }))

    expect(openExternalUrlMock).not.toHaveBeenCalled()
  })

  it("calls openExternalUrl once in Tauri runtime", () => {
    ;(window as unknown as Record<string, unknown>).__TAURI__ = {}
    render(<OpenExternalLink href="https://docs.vana.org">Docs</OpenExternalLink>)

    fireEvent.click(screen.getByRole("link", { name: "Docs" }))

    expect(openExternalUrlMock).toHaveBeenCalledTimes(1)
    expect(openExternalUrlMock).toHaveBeenCalledWith("https://docs.vana.org")
  })
})
