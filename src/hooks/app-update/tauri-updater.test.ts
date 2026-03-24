import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  canUseTauriUpdater,
  checkForTauriUpdate,
  clearPendingTauriUpdate,
  downloadTauriUpdate,
  installTauriUpdate,
  relaunchTauriApp,
} from "./tauri-updater"

const {
  mockCheck,
  mockRelaunch,
  mockClose,
  mockDownload,
  mockInstall,
} = vi.hoisted(() => ({
  mockCheck: vi.fn(),
  mockRelaunch: vi.fn(),
  mockClose: vi.fn(),
  mockDownload: vi.fn(),
  mockInstall: vi.fn(),
}))

vi.mock("@tauri-apps/plugin-updater", () => ({
  check: (...args: unknown[]) => mockCheck(...args),
}))

vi.mock("@tauri-apps/plugin-process", () => ({
  relaunch: (...args: unknown[]) => mockRelaunch(...args),
}))

describe("tauri-updater", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    Object.assign(window, { __TAURI__: {} })
    Object.defineProperty(window.navigator, "platform", {
      configurable: true,
      value: "MacIntel",
    })
    await clearPendingTauriUpdate()
  })

  it("reports availability and runs staged install actions on macOS Tauri", async () => {
    mockCheck.mockResolvedValue({
      currentVersion: "0.7.41",
      version: "0.7.42",
      date: "2026-03-24T08:00:00Z",
      body: "Release notes",
      rawJson: { version: "0.7.42" },
      close: mockClose,
      download: mockDownload,
      install: mockInstall,
    })

    expect(canUseTauriUpdater()).toBe(true)

    const update = await checkForTauriUpdate()

    expect(update).toEqual({
      currentVersion: "0.7.41",
      version: "0.7.42",
      date: "2026-03-24T08:00:00Z",
      body: "Release notes",
      rawJson: { version: "0.7.42" },
    })

    await expect(downloadTauriUpdate()).resolves.toBe(true)
    await expect(installTauriUpdate()).resolves.toBe(true)
    await expect(relaunchTauriApp()).resolves.toBe(true)

    expect(mockDownload).toHaveBeenCalledTimes(1)
    expect(mockInstall).toHaveBeenCalledTimes(1)
    expect(mockClose).toHaveBeenCalledTimes(1)
    expect(mockRelaunch).toHaveBeenCalledTimes(1)
  })

  it("fails soft outside the macOS Tauri runtime", async () => {
    Reflect.deleteProperty(window, "__TAURI__")
    Object.defineProperty(window.navigator, "platform", {
      configurable: true,
      value: "Win32",
    })

    expect(canUseTauriUpdater()).toBe(false)
    await expect(checkForTauriUpdate()).resolves.toBeNull()
    await expect(downloadTauriUpdate()).resolves.toBe(false)
    await expect(installTauriUpdate()).resolves.toBe(false)
    await expect(relaunchTauriApp()).resolves.toBe(false)

    expect(mockCheck).not.toHaveBeenCalled()
    expect(mockRelaunch).not.toHaveBeenCalled()
  })
})
