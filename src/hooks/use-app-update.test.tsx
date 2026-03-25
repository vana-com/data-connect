import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { MemoryRouter } from "react-router-dom"
import { AppUpdateProvider, useAppUpdate } from "./use-app-update"

const {
  mockCheckAppUpdate,
  mockCheckForTauriUpdate,
  mockDownloadTauriUpdate,
  mockInstallTauriUpdate,
  mockIsMacOsTauriUpdaterRuntime,
  mockOpenExternalUrl,
  mockRelaunchTauriApp,
  mockToast,
} = vi.hoisted(() => ({
  mockCheckAppUpdate: vi.fn(),
  mockCheckForTauriUpdate: vi.fn(),
  mockDownloadTauriUpdate: vi.fn(),
  mockInstallTauriUpdate: vi.fn(),
  mockIsMacOsTauriUpdaterRuntime: vi.fn(),
  mockOpenExternalUrl: vi.fn(),
  mockRelaunchTauriApp: vi.fn(),
  mockToast: Object.assign(vi.fn(), { dismiss: vi.fn() }),
}))

vi.mock("@/hooks/app-update/check-app-update", () => ({
  checkAppUpdate: (...args: unknown[]) => mockCheckAppUpdate(...args),
}))

vi.mock("@/hooks/app-update/tauri-updater", () => ({
  checkForTauriUpdate: (...args: unknown[]) => mockCheckForTauriUpdate(...args),
  downloadTauriUpdate: (...args: unknown[]) => mockDownloadTauriUpdate(...args),
  installTauriUpdate: (...args: unknown[]) => mockInstallTauriUpdate(...args),
  isMacOsTauriUpdaterRuntime: (...args: unknown[]) =>
    mockIsMacOsTauriUpdaterRuntime(...args),
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

async function flushMicrotasks() {
  await Promise.resolve()
  await Promise.resolve()
}

describe("AppUpdateProvider", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    mockIsMacOsTauriUpdaterRuntime.mockReturnValue(false)
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it("shows fallback update toast when a newer version is found", async () => {
    mockCheckAppUpdate.mockResolvedValue({
      status: "updateAvailable",
      localVersion: "1.2.3",
      remoteVersion: "1.2.4",
      releaseUrl: "https://github.com/vana-com/data-connect/releases/latest",
    })

    renderWithAppUpdateProvider()

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        "Update available",
        expect.objectContaining({
          description: "Version 1.2.4 is ready",
        })
      )
    })
  })

  it("waits for the macOS startup settle delay before checking", async () => {
    vi.useFakeTimers()
    mockIsMacOsTauriUpdaterRuntime.mockReturnValue(true)
    mockCheckForTauriUpdate.mockResolvedValue(null)

    renderWithAppUpdateProvider()

    expect(mockCheckForTauriUpdate).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(4_999)
    expect(mockCheckForTauriUpdate).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    await flushMicrotasks()

    expect(mockCheckForTauriUpdate).toHaveBeenCalledTimes(1)
  })

  it("downloads a macOS update before showing the restart toast", async () => {
    vi.useFakeTimers()
    mockIsMacOsTauriUpdaterRuntime.mockReturnValue(true)
    const update = {
      version: "1.2.4",
      notes: "Release notes",
      publishedAt: "2026-03-24T09:10:11Z",
      download: vi.fn(),
      install: vi.fn(),
    }

    mockCheckForTauriUpdate.mockResolvedValue(update)
    mockDownloadTauriUpdate.mockResolvedValue(undefined)

    renderWithAppUpdateProvider()

    await vi.advanceTimersByTimeAsync(5_000)
    await flushMicrotasks()

    expect(mockDownloadTauriUpdate).toHaveBeenCalledWith(update)
    expect(mockToast).toHaveBeenCalledWith(
      "Restart to update",
      expect.objectContaining({
        description: "Version 1.2.4 is ready",
      })
    )
  })

  it("shows only one debug toast on initial debug mount", async () => {
    renderWithAppUpdateProvider(["/?appUpdateScenario=update-available"])

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledTimes(1)
    })
    expect(mockCheckAppUpdate).toHaveBeenCalledTimes(1)
  })

  it("dismisses a staged macOS update for the current session only", async () => {
    vi.useFakeTimers()
    mockIsMacOsTauriUpdaterRuntime.mockReturnValue(true)
    const update = {
      version: "1.2.4",
      notes: "Release notes",
      publishedAt: "2026-03-24T09:10:11Z",
      download: vi.fn(),
      install: vi.fn(),
    }

    mockCheckForTauriUpdate.mockResolvedValue(update)
    mockDownloadTauriUpdate.mockResolvedValue(undefined)

    renderWithAppUpdateProvider()

    await vi.advanceTimersByTimeAsync(5_000)
    await flushMicrotasks()
    expect(mockToast).toHaveBeenCalledTimes(1)

    const lastCall = mockToast.mock.calls.at(-1)
    const options = lastCall?.[1] as {
      cancel: { onClick: () => void }
    }
    options.cancel.onClick()

    expect(
      localStorage.getItem("dataconnect_app_update_dismissed_version")
    ).toBeNull()
    expect(mockToast.dismiss).toHaveBeenCalledWith("app-update-toast")

    fireEvent.click(screen.getByRole("button", { name: "Trigger check" }))
    await flushMicrotasks()

    expect(mockCheckForTauriUpdate).toHaveBeenCalledTimes(1)
    expect(mockDownloadTauriUpdate).toHaveBeenCalledTimes(1)
    expect(mockToast).toHaveBeenCalledTimes(1)
  })

  it("re-shows a dismissed staged macOS update on manual check", async () => {
    vi.useFakeTimers()
    mockIsMacOsTauriUpdaterRuntime.mockReturnValue(true)
    const update = {
      version: "1.2.4",
      notes: "Release notes",
      publishedAt: "2026-03-24T09:10:11Z",
      download: vi.fn(),
      install: vi.fn(),
    }

    mockCheckForTauriUpdate.mockResolvedValue(update)
    mockDownloadTauriUpdate.mockResolvedValue(undefined)

    renderWithAppUpdateProvider()

    await vi.advanceTimersByTimeAsync(5_000)
    await flushMicrotasks()
    expect(mockToast).toHaveBeenCalledTimes(1)

    const firstOptions = mockToast.mock.calls.at(-1)?.[1] as {
      cancel: { onClick: () => void }
    }
    firstOptions.cancel.onClick()

    fireEvent.click(
      screen.getByRole("button", { name: "Trigger manual check" })
    )

    await flushMicrotasks()
    expect(mockToast).toHaveBeenCalledTimes(2)
  })

  it("installs and relaunches the staged macOS update on restart", async () => {
    vi.useFakeTimers()
    mockIsMacOsTauriUpdaterRuntime.mockReturnValue(true)
    const update = {
      version: "1.2.4",
      notes: "Release notes",
      publishedAt: "2026-03-24T09:10:11Z",
      download: vi.fn(),
      install: vi.fn(),
    }

    mockCheckForTauriUpdate.mockResolvedValue(update)
    mockDownloadTauriUpdate.mockResolvedValue(undefined)
    mockInstallTauriUpdate.mockResolvedValue(undefined)
    mockRelaunchTauriApp.mockResolvedValue(undefined)

    renderWithAppUpdateProvider()

    await vi.advanceTimersByTimeAsync(5_000)
    await flushMicrotasks()
    expect(mockToast).toHaveBeenCalledTimes(1)

    const lastCall = mockToast.mock.calls.at(-1)
    const options = lastCall?.[1] as {
      action: { onClick: () => void }
    }
    options.action.onClick()

    await flushMicrotasks()

    expect(mockInstallTauriUpdate).toHaveBeenCalledWith(update)
    expect(mockRelaunchTauriApp).toHaveBeenCalledTimes(1)
  })

  it("keeps the fallback dismissed version behavior on non-macOS", async () => {
    mockCheckAppUpdate.mockResolvedValue({
      status: "updateAvailable",
      localVersion: "1.2.3",
      remoteVersion: "1.2.4",
      releaseUrl: "https://github.com/vana-com/data-connect/releases/latest",
    })

    renderWithAppUpdateProvider()

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalled()
    })

    const lastCall = mockToast.mock.calls.at(-1)
    const options = lastCall?.[1] as {
      cancel: { onClick: () => void }
    }
    options.cancel.onClick()

    expect(
      localStorage.getItem("dataconnect_app_update_dismissed_version")
    ).toBe("1.2.4")
    expect(mockToast.dismiss).toHaveBeenCalledWith("app-update-toast")

    fireEvent.click(screen.getByRole("button", { name: "Trigger check" }))
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledTimes(1)
    })
  })

  it("re-shows fallback toast for a newer version after dismissal", async () => {
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

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        "Update available",
        expect.objectContaining({
          description: "Version 1.2.4 is ready",
        })
      )
    })

    const firstOptions = mockToast.mock.calls.at(-1)?.[1] as {
      cancel: { onClick: () => void }
    }
    firstOptions.cancel.onClick()

    fireEvent.click(screen.getByRole("button", { name: "Trigger check" }))

    await waitFor(() => {
      expect(mockToast).toHaveBeenLastCalledWith(
        "Update available",
        expect.objectContaining({
          description: "Version 1.2.5 is ready",
        })
      )
    })
  })

  it("re-shows dismissed same-version fallback toast on manual check", async () => {
    mockCheckAppUpdate.mockResolvedValue({
      status: "updateAvailable",
      localVersion: "1.2.3",
      remoteVersion: "1.2.4",
      releaseUrl: "https://github.com/vana-com/data-connect/releases/latest",
    })

    renderWithAppUpdateProvider()

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledTimes(1)
    })

    const firstOptions = mockToast.mock.calls.at(-1)?.[1] as {
      cancel: { onClick: () => void }
    }
    firstOptions.cancel.onClick()

    fireEvent.click(screen.getByRole("button", { name: "Trigger check" }))
    expect(mockToast).toHaveBeenCalledTimes(1)
    await waitFor(() => {
      expect(mockCheckAppUpdate).toHaveBeenCalledTimes(2)
    })

    fireEvent.click(
      screen.getByRole("button", { name: "Trigger manual check" })
    )
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledTimes(2)
    })
  })

  it("opens release URL when fallback update now is clicked", async () => {
    mockCheckAppUpdate.mockResolvedValue({
      status: "updateAvailable",
      localVersion: "1.2.3",
      remoteVersion: "1.2.4",
      releaseUrl: "https://github.com/vana-com/data-connect/releases/latest",
    })

    renderWithAppUpdateProvider()

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalled()
    })

    const lastCall = mockToast.mock.calls.at(-1)
    const options = lastCall?.[1] as {
      action: { onClick: () => void }
    }
    options.action.onClick()

    expect(mockOpenExternalUrl).toHaveBeenCalledWith(
      "https://github.com/vana-com/data-connect/releases/latest"
    )
    expect(mockToast.dismiss).toHaveBeenCalledWith("app-update-toast")
  })
})
