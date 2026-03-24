import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { MemoryRouter } from "react-router-dom"
import { AppUpdateProvider, useAppUpdate } from "./use-app-update"

const {
  mockCanUseTauriUpdater,
  mockCheckAppUpdate,
  mockCheckForTauriUpdate,
  mockDownloadTauriUpdate,
  mockInstallTauriUpdate,
  mockOpenExternalUrl,
  mockRelaunchTauriApp,
  mockToast,
} = vi.hoisted(() => ({
  mockCanUseTauriUpdater: vi.fn(),
  mockCheckAppUpdate: vi.fn(),
  mockCheckForTauriUpdate: vi.fn(),
  mockDownloadTauriUpdate: vi.fn(),
  mockInstallTauriUpdate: vi.fn(),
  mockOpenExternalUrl: vi.fn(),
  mockRelaunchTauriApp: vi.fn(),
  mockToast: Object.assign(vi.fn(), { dismiss: vi.fn() }),
}))

vi.mock("@/hooks/app-update/check-app-update", () => ({
  checkAppUpdate: (...args: unknown[]) => mockCheckAppUpdate(...args),
}))

vi.mock("@/hooks/app-update/tauri-updater", () => ({
  canUseTauriUpdater: () => mockCanUseTauriUpdater(),
  checkForTauriUpdate: (...args: unknown[]) => mockCheckForTauriUpdate(...args),
  clearPendingTauriUpdate: vi.fn(),
  downloadTauriUpdate: (...args: unknown[]) => mockDownloadTauriUpdate(...args),
  installTauriUpdate: (...args: unknown[]) => mockInstallTauriUpdate(...args),
  relaunchTauriApp: (...args: unknown[]) => mockRelaunchTauriApp(...args),
}))

vi.mock("@/lib/open-resource", () => ({
  openExternalUrl: (...args: unknown[]) => mockOpenExternalUrl(...args),
}))

vi.mock("sonner", () => ({
  toast: mockToast,
}))

function AppUpdateTestHarness() {
  const { checkForUpdates, isChecking, lastStatus } = useAppUpdate()

  return (
    <div>
      <button type="button" onClick={() => void checkForUpdates()}>
        Trigger check
      </button>
      <button
        type="button"
        onClick={() => void checkForUpdates({ ignoreDismissedVersion: true })}
      >
        Trigger manual check
      </button>
      <span data-testid="app-update-checking">{String(isChecking)}</span>
      <span data-testid="app-update-status">{lastStatus}</span>
    </div>
  )
}

function renderWithAppUpdateProvider(initialEntries?: string[]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AppUpdateProvider>
        <AppUpdateTestHarness />
      </AppUpdateProvider>
    </MemoryRouter>
  )
}

async function settleInitialCheck() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1500)
    await Promise.resolve()
    await Promise.resolve()
  })
}

async function flushAsyncWork() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe("AppUpdateProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
    vi.clearAllMocks()
    mockCanUseTauriUpdater.mockReturnValue(false)
    mockDownloadTauriUpdate.mockResolvedValue(true)
    mockInstallTauriUpdate.mockResolvedValue(true)
    mockRelaunchTauriApp.mockResolvedValue(true)
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it("shows update toast when a newer version is found", async () => {
    mockCheckAppUpdate.mockResolvedValue({
      status: "updateAvailable",
      localVersion: "1.2.3",
      remoteVersion: "1.2.4",
      releaseUrl: "https://github.com/vana-com/data-connect/releases/latest",
    })

    renderWithAppUpdateProvider()
    await settleInitialCheck()

    expect(mockToast).toHaveBeenCalledWith(
      "Update available",
      expect.objectContaining({
        description: "Version 1.2.4 is ready",
      })
    )
  })

  it("shows only one debug toast on initial debug mount", async () => {
    renderWithAppUpdateProvider(["/?appUpdateScenario=update-available"])
    await settleInitialCheck()

    expect(mockToast).toHaveBeenCalledTimes(1)
    expect(mockCheckAppUpdate).toHaveBeenCalledTimes(1)
  })

  it("dismisses fallback updates and suppresses the same version", async () => {
    mockCheckAppUpdate.mockResolvedValue({
      status: "updateAvailable",
      localVersion: "1.2.3",
      remoteVersion: "1.2.4",
      releaseUrl: "https://github.com/vana-com/data-connect/releases/latest",
    })

    renderWithAppUpdateProvider()
    await settleInitialCheck()

    expect(mockToast).toHaveBeenCalled()

    const options = mockToast.mock.calls.at(-1)?.[1] as {
      cancel: { onClick: () => void }
    }
    options.cancel.onClick()

    expect(
      localStorage.getItem("dataconnect_app_update_dismissed_version")
    ).toBe("1.2.4")
    expect(mockToast.dismiss).toHaveBeenCalledWith("app-update-toast")

    fireEvent.click(screen.getByRole("button", { name: "Trigger check" }))
    expect(mockToast).toHaveBeenCalledTimes(1)
  })

  it("re-shows a newer fallback version after dismissal", async () => {
    mockCheckAppUpdate
      .mockResolvedValueOnce({
        status: "updateAvailable",
        localVersion: "1.2.3",
        remoteVersion: "1.2.4",
        releaseUrl: "https://github.com/vana-com/data-connect/releases/latest",
      })
      .mockResolvedValueOnce({
        status: "updateAvailable",
        localVersion: "1.2.3",
        remoteVersion: "1.2.5",
        releaseUrl: "https://github.com/vana-com/data-connect/releases/latest",
      })

    renderWithAppUpdateProvider()
    await settleInitialCheck()

    expect(mockToast).toHaveBeenCalledWith(
      "Update available",
      expect.objectContaining({
        description: "Version 1.2.4 is ready",
      })
    )

    const firstOptions = mockToast.mock.calls.at(-1)?.[1] as {
      cancel: { onClick: () => void }
    }
    firstOptions.cancel.onClick()

    fireEvent.click(screen.getByRole("button", { name: "Trigger check" }))
    await flushAsyncWork()

    expect(mockToast).toHaveBeenLastCalledWith(
      "Update available",
      expect.objectContaining({
        description: "Version 1.2.5 is ready",
      })
    )
  })

  it("re-shows a dismissed fallback same-version toast on manual check", async () => {
    mockCheckAppUpdate.mockResolvedValue({
      status: "updateAvailable",
      localVersion: "1.2.3",
      remoteVersion: "1.2.4",
      releaseUrl: "https://github.com/vana-com/data-connect/releases/latest",
    })

    renderWithAppUpdateProvider()
    await settleInitialCheck()

    expect(mockToast).toHaveBeenCalledTimes(1)

    const options = mockToast.mock.calls.at(-1)?.[1] as {
      cancel: { onClick: () => void }
    }
    options.cancel.onClick()

    fireEvent.click(screen.getByRole("button", { name: "Trigger check" }))
    await flushAsyncWork()
    expect(mockCheckAppUpdate).toHaveBeenCalledTimes(2)
    expect(mockToast).toHaveBeenCalledTimes(1)

    fireEvent.click(
      screen.getByRole("button", { name: "Trigger manual check" })
    )
    await flushAsyncWork()
    expect(mockToast).toHaveBeenCalledTimes(2)
  })

  it("opens the release URL when update now is clicked", async () => {
    mockCheckAppUpdate.mockResolvedValue({
      status: "updateAvailable",
      localVersion: "1.2.3",
      remoteVersion: "1.2.4",
      releaseUrl: "https://github.com/vana-com/data-connect/releases/latest",
    })

    renderWithAppUpdateProvider()
    await settleInitialCheck()

    expect(mockToast).toHaveBeenCalled()

    const options = mockToast.mock.calls.at(-1)?.[1] as {
      action: { onClick: () => void }
    }
    options.action.onClick()

    expect(mockOpenExternalUrl).toHaveBeenCalledWith(
      "https://github.com/vana-com/data-connect/releases/latest"
    )
    expect(mockToast.dismiss).toHaveBeenCalledWith("app-update-toast")
  })

  it("downloads silently and shows a restart toast for macOS tauri updates", async () => {
    mockCanUseTauriUpdater.mockReturnValue(true)
    mockCheckForTauriUpdate.mockResolvedValue({
      currentVersion: "1.2.3",
      version: "1.2.4",
      rawJson: { version: "1.2.4" },
    })

    renderWithAppUpdateProvider()
    await settleInitialCheck()

    expect(mockDownloadTauriUpdate).toHaveBeenCalledTimes(1)
    expect(mockToast).toHaveBeenCalledWith(
      "Restart to update",
      expect.objectContaining({
        description: "Version 1.2.4 is ready",
      })
    )

    expect(mockCheckAppUpdate).not.toHaveBeenCalled()
  })

  it("suppresses restart-ready toast for the session and re-shows it on manual check", async () => {
    mockCanUseTauriUpdater.mockReturnValue(true)
    mockCheckForTauriUpdate.mockResolvedValue({
      currentVersion: "1.2.3",
      version: "1.2.4",
      rawJson: { version: "1.2.4" },
    })

    renderWithAppUpdateProvider()
    await settleInitialCheck()

    expect(mockToast).toHaveBeenCalledTimes(1)

    const options = mockToast.mock.calls.at(-1)?.[1] as {
      cancel: { onClick: () => void }
    }
    options.cancel.onClick()

    fireEvent.click(screen.getByRole("button", { name: "Trigger check" }))
    await flushAsyncWork()
    expect(mockCheckForTauriUpdate).toHaveBeenCalledTimes(2)
    expect(mockToast).toHaveBeenCalledTimes(1)

    fireEvent.click(
      screen.getByRole("button", { name: "Trigger manual check" })
    )
    await flushAsyncWork()
    expect(mockToast).toHaveBeenCalledTimes(2)
  })

  it("installs and relaunches when restart now is clicked", async () => {
    mockCanUseTauriUpdater.mockReturnValue(true)
    mockCheckForTauriUpdate.mockResolvedValue({
      currentVersion: "1.2.3",
      version: "1.2.4",
      rawJson: { version: "1.2.4" },
    })

    renderWithAppUpdateProvider()
    await settleInitialCheck()

    expect(mockToast).toHaveBeenCalled()

    const options = mockToast.mock.calls.at(-1)?.[1] as {
      action: { onClick: () => void }
    }
    options.action.onClick()

    await flushAsyncWork()
    expect(mockInstallTauriUpdate).toHaveBeenCalledTimes(1)
    expect(mockRelaunchTauriApp).toHaveBeenCalledTimes(1)
  })
})
