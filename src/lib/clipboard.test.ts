import { beforeEach, describe, expect, it, vi } from "vitest"
import { writeText } from "@tauri-apps/plugin-clipboard-manager"

vi.mock("@tauri-apps/plugin-clipboard-manager", () => ({
  writeText: vi.fn(),
}))

// Mock isTauri to true so the Tauri clipboard fallback path runs
vi.mock("@/lib/runtime", () => ({
  isTauri: true,
}))

describe("copyTextToClipboard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("falls back to tauri clipboard plugin when browser clipboard paths fail", async () => {
    const { copyTextToClipboard } = await import("./clipboard")
    const originalClipboard = navigator.clipboard
    const originalExecCommand = document.execCommand

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn().mockRejectedValue(new Error("denied")),
      },
    })
    document.execCommand = vi.fn(() => false)
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
    }
  })
})
