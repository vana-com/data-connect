import { beforeEach, describe, expect, it, vi } from "vitest"
import { startBrowserAuthFlow } from "@/lib/start-browser-auth"

const mockInvoke = vi.fn()
const mockOpenExternalUrl = vi.fn()

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}))

vi.mock("@/lib/open-resource", () => ({
  openExternalUrl: (...args: unknown[]) => mockOpenExternalUrl(...args),
}))

describe("startBrowserAuthFlow", () => {
  beforeEach(() => {
    mockInvoke.mockReset()
    mockOpenExternalUrl.mockReset()
    delete (window as { __TAURI__?: object }).__TAURI__
    delete (window as { __TAURI_INTERNALS__?: object }).__TAURI_INTERNALS__
  })

  it("returns invoke URL when tauri command succeeds", async () => {
    mockInvoke.mockResolvedValue("http://localhost:3083")

    const result = await startBrowserAuthFlow()

    expect(result).toBe("http://localhost:3083")
    expect(mockOpenExternalUrl).not.toHaveBeenCalled()
  })

  it("falls back to plain passport URL in non-tauri runtime", async () => {
    mockInvoke.mockRejectedValue(new Error("invoke unavailable"))
    mockOpenExternalUrl.mockResolvedValue(true)

    const result = await startBrowserAuthFlow()

    expect(mockOpenExternalUrl).toHaveBeenCalledWith("https://passport.vana.org")
    expect(result).toBe("https://passport.vana.org")
  })

  it("does not fall back when tauri invoke fails", async () => {
    ;(window as { __TAURI__?: object }).__TAURI__ = {}
    mockInvoke.mockRejectedValue(new Error("tauri backend unavailable"))

    const result = await startBrowserAuthFlow()

    expect(result).toBeNull()
    expect(mockOpenExternalUrl).not.toHaveBeenCalled()
  })
})
