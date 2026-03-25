import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  checkForTauriUpdate,
  downloadTauriUpdate,
  installTauriUpdate,
  isMacOsTauriUpdaterRuntime,
  relaunchTauriApp,
  type TauriUpdaterHandle,
} from "./tauri-updater"

const { mockCheck, mockRelaunch } = vi.hoisted(() => ({
  mockCheck: vi.fn(),
  mockRelaunch: vi.fn(),
}))

vi.mock("@tauri-apps/plugin-updater", () => ({
  check: () => mockCheck(),
}))

vi.mock("@tauri-apps/plugin-process", () => ({
  relaunch: () => mockRelaunch(),
}))

function setRuntime({
  isTauri,
  platform,
}: {
  isTauri: boolean
  platform: string
}) {
  if (isTauri) {
    Object.assign(window, { __TAURI__: {} })
  } else {
    Reflect.deleteProperty(window, "__TAURI__")
    Reflect.deleteProperty(window, "__TAURI_INTERNALS__")
  }

  Object.defineProperty(window.navigator, "platform", {
    configurable: true,
    value: platform,
  })
}

function createHandle(version = "1.2.4"): TauriUpdaterHandle {
  return {
    version,
    notes: "Release notes",
    publishedAt: "2026-03-24T09:10:11Z",
    download: vi.fn().mockResolvedValue(undefined),
    install: vi.fn().mockResolvedValue(undefined),
  }
}

describe("tauri updater seam", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setRuntime({ isTauri: true, platform: "MacIntel" })
  })

  it("detects the macOS tauri updater runtime", () => {
    expect(isMacOsTauriUpdaterRuntime()).toBe(true)

    setRuntime({ isTauri: false, platform: "MacIntel" })
    expect(isMacOsTauriUpdaterRuntime()).toBe(false)

    setRuntime({ isTauri: true, platform: "Win32" })
    expect(isMacOsTauriUpdaterRuntime()).toBe(false)
  })

  it("wraps a native update into the app seam", async () => {
    const download = vi.fn().mockResolvedValue(undefined)
    const install = vi.fn().mockResolvedValue(undefined)

    mockCheck.mockResolvedValue({
      version: "1.2.4",
      body: "Release notes",
      date: "2026-03-24T09:10:11Z",
      download,
      install,
    })

    const update = await checkForTauriUpdate()

    expect(update).toMatchObject({
      version: "1.2.4",
      notes: "Release notes",
      publishedAt: "2026-03-24T09:10:11Z",
    })

    await downloadTauriUpdate(update!)
    await installTauriUpdate(update!)
    await relaunchTauriApp()

    expect(download).toHaveBeenCalledTimes(1)
    expect(install).toHaveBeenCalledTimes(1)
    expect(mockRelaunch).toHaveBeenCalledTimes(1)
  })

  it("fails soft outside the macOS tauri runtime", async () => {
    setRuntime({ isTauri: false, platform: "MacIntel" })

    expect(await checkForTauriUpdate()).toBeNull()

    const update = createHandle()
    await downloadTauriUpdate(update)
    await installTauriUpdate(update)
    await relaunchTauriApp()

    expect(mockCheck).not.toHaveBeenCalled()
    expect(update.download).not.toHaveBeenCalled()
    expect(update.install).not.toHaveBeenCalled()
    expect(mockRelaunch).not.toHaveBeenCalled()
  })
})
