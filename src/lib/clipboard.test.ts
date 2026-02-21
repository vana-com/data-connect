import { beforeEach, describe, expect, it, vi } from "vitest"
import { copyTextToClipboard } from "./clipboard"
import { writeText } from "@tauri-apps/plugin-clipboard-manager"

vi.mock("@tauri-apps/plugin-clipboard-manager", () => ({
  writeText: vi.fn(),
}))

describe("copyTextToClipboard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("falls back to tauri clipboard plugin when browser clipboard paths fail", async () => {
    const originalClipboard = navigator.clipboard
    const originalExecCommand = document.execCommand
    const hadTauri = "__TAURI__" in window
    const previousTauri = (window as { __TAURI__?: unknown }).__TAURI__

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn().mockRejectedValue(new Error("denied")),
      },
    })
    document.execCommand = vi.fn(() => false)
    Object.defineProperty(window, "__TAURI__", {
      configurable: true,
      value: {},
    })
    vi.mocked(writeText).mockResolvedValue(undefined)

    try {
      const copied = await copyTextToClipboard('{"ok":true}')

      expect(copied).toBe(true)
      expect(writeText).toHaveBeenCalledWith('{"ok":true}')
    } finally {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: originalClipboard,
      })
      document.execCommand = originalExecCommand
      if (hadTauri) {
        Object.defineProperty(window, "__TAURI__", {
          configurable: true,
          value: previousTauri,
        })
      } else {
        delete (window as { __TAURI__?: unknown }).__TAURI__
      }
    }
  })
})
