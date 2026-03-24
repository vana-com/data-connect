import { beforeEach, describe, expect, it, vi } from "vitest"
import { checkForTauriAppUpdate, isTauriMacOsRuntime } from "./tauri-updater"

const { mockCheck, mockRelaunch } = vi.hoisted(() => ({
  mockCheck: vi.fn(),
  mockRelaunch: vi.fn(),
}))

vi.mock("@tauri-apps/plugin-updater", () => ({
  check: (...args: unknown[]) => mockCheck(...args),
}))

vi.mock("@tauri-apps/plugin-process", () => ({
  relaunch: (...args: unknown[]) => mockRelaunch(...args),
}))

describe("tauri updater seam", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Reflect.deleteProperty(window, "__TAURI__")
    Reflect.deleteProperty(window, "__TAURI_INTERNALS__")
  })

  it("detects a macOS tauri runtime", () => {
    Object.assign(window, { __TAURI__: {} })
    const originalPlatform = navigator.platform
    Object.defineProperty(window.navigator, "platform", {
      configurable: true,
      value: "MacIntel",
    })

    expect(isTauriMacOsRuntime()).toBe(true)

    Object.defineProperty(window.navigator, "platform", {
      configurable: true,
      value: originalPlatform,
    })
  })

  it("returns null when no native update is available", async () => {
    mockCheck.mockResolvedValue(null)

    await expect(checkForTauriAppUpdate()).resolves.toBeNull()
  })

  it("downloads once, then installs and relaunches", async () => {
    const update = {
      currentVersion: "1.2.3",
      version: "1.2.4",
      body: "notes",
      download: vi.fn().mockResolvedValue(undefined),
      install: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    }
    mockCheck.mockResolvedValue(update)
    mockRelaunch.mockResolvedValue(undefined)

    const tauriUpdate = await checkForTauriAppUpdate()
    expect(tauriUpdate).not.toBeNull()

    await tauriUpdate?.download()
    await tauriUpdate?.download()
    await tauriUpdate?.installAndRelaunch()

    expect(update.download).toHaveBeenCalledTimes(1)
    expect(update.install).toHaveBeenCalledTimes(1)
    expect(mockRelaunch).toHaveBeenCalledTimes(1)
  })
})
