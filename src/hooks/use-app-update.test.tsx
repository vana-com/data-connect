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
  mockCheckForTauriAppUpdate,
  mockIsTauriMacOsRuntime,
  mockOpenExternalUrl,
  mockToast,
} = vi.hoisted(() => ({
  mockCheckAppUpdate: vi.fn(),
  mockCheckForTauriAppUpdate: vi.fn(),
  mockIsTauriMacOsRuntime: vi.fn(),
  mockOpenExternalUrl: vi.fn(),
  mockToast: Object.assign(vi.fn(), { dismiss: vi.fn() }),
}))

vi.mock("@/hooks/app-update/check-app-update", () => ({
  checkAppUpdate: (...args: unknown[]) => mockCheckAppUpdate(...args),
}))

vi.mock("@/hooks/app-update/tauri-updater", () => ({
  checkForTauriAppUpdate: (...args: unknown[]) =>
    mockCheckForTauriAppUpdate(...args),
  isTauriMacOsRuntime: () => mockIsTauriMacOsRuntime(),
}))

vi.mock("@/lib/open-resource", () => ({
  openExternalUrl: (...args: unknown[]) => mockOpenExternalUrl(...args),
}))

vi.mock("sonner", () => ({
  toast: mockToast,
}))

function createMockTauriUpdate(version = "1.2.4") {
  return {
    currentVersion: "1.2.3",
    version,
    notes: null,
    download: vi.fn().mockResolvedValue(undefined),
    installAndRelaunch: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  }
}

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

describe("AppUpdateProvider", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    mockIsTauriMacOsRuntime.mockReturnValue(false)
    mockCheckAppUpdate.mockResolvedValue({
      status: "upToDate",
      localVersion: "1.2.3",
      remoteVersion: "1.2.3",
      releaseUrl: "https://github.com/vana-com/data-connect/releases/latest",
    })
    mockCheckForTauriAppUpdate.mockResolvedValue(null)
  })

  afterEach(() => {
    cleanup()
  })

  it("shows release-page update toast when a newer non-macOS version is found", async () => {
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

  it("downloads a macOS update silently and then shows a restart toast", async () => {
    mockIsTauriMacOsRuntime.mockReturnValue(true)
    const update = createMockTauriUpdate()
    mockCheckForTauriAppUpdate.mockResolvedValue(update)

    renderWithAppUpdateProvider()

    await waitFor(() => {
      expect(update.download).toHaveBeenCalledTimes(1)
    })
    expect(screen.getByTestId("app-update-status").textContent).toBe(
      "restartReady"
    )
    expect(mockToast).toHaveBeenCalledWith(
      "Restart to update",
      expect.objectContaining({
        description: "Version 1.2.4 is ready",
      })
    )
  })

  it("reuses a staged macOS update without re-downloading it", async () => {
    mockIsTauriMacOsRuntime.mockReturnValue(true)
    const stagedUpdate = createMockTauriUpdate("1.2.4")
    const duplicateUpdate = createMockTauriUpdate("1.2.4")
    mockCheckForTauriAppUpdate
      .mockResolvedValueOnce(stagedUpdate)
      .mockResolvedValueOnce(duplicateUpdate)

    renderWithAppUpdateProvider()

    await waitFor(() => {
      expect(stagedUpdate.download).toHaveBeenCalledTimes(1)
    })

    fireEvent.click(screen.getByRole("button", { name: "Trigger check" }))

    await waitFor(() => {
      expect(duplicateUpdate.close).toHaveBeenCalledTimes(1)
    })
    expect(duplicateUpdate.download).not.toHaveBeenCalled()
    expect(stagedUpdate.download).toHaveBeenCalledTimes(1)
  })

  it("suppresses a staged macOS update for the session after Later", async () => {
    mockIsTauriMacOsRuntime.mockReturnValue(true)
    const stagedUpdate = createMockTauriUpdate("1.2.4")
    const duplicateUpdate = createMockTauriUpdate("1.2.4")
    mockCheckForTauriAppUpdate
      .mockResolvedValueOnce(stagedUpdate)
      .mockResolvedValueOnce(duplicateUpdate)

    renderWithAppUpdateProvider()

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledTimes(1)
    })

    const firstOptions = mockToast.mock.calls.at(-1)?.[1] as {
      cancel: { onClick: () => void }
    }
    firstOptions.cancel.onClick()

    fireEvent.click(screen.getByRole("button", { name: "Trigger check" }))

    await waitFor(() => {
      expect(duplicateUpdate.close).toHaveBeenCalledTimes(1)
    })
    expect(mockToast).toHaveBeenCalledTimes(1)
  })

  it("re-shows a staged macOS update on manual check after Later", async () => {
    mockIsTauriMacOsRuntime.mockReturnValue(true)
    const stagedUpdate = createMockTauriUpdate("1.2.4")
    const duplicateUpdate = createMockTauriUpdate("1.2.4")
    mockCheckForTauriAppUpdate
      .mockResolvedValueOnce(stagedUpdate)
      .mockResolvedValueOnce(duplicateUpdate)

    renderWithAppUpdateProvider()

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledTimes(1)
    })

    const firstOptions = mockToast.mock.calls.at(-1)?.[1] as {
      cancel: { onClick: () => void }
    }
    firstOptions.cancel.onClick()

    fireEvent.click(
      screen.getByRole("button", { name: "Trigger manual check" })
    )

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledTimes(2)
    })
  })

  it("installs and relaunches a staged macOS update on Restart now", async () => {
    mockIsTauriMacOsRuntime.mockReturnValue(true)
    const stagedUpdate = createMockTauriUpdate("1.2.4")
    mockCheckForTauriAppUpdate.mockResolvedValue(stagedUpdate)

    renderWithAppUpdateProvider()

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalled()
    })

    const options = mockToast.mock.calls.at(-1)?.[1] as {
      action: { onClick: () => void }
    }
    options.action.onClick()

    await waitFor(() => {
      expect(stagedUpdate.installAndRelaunch).toHaveBeenCalledTimes(1)
    })
  })

  it("opens the release URL when Update now is clicked on the fallback toast", async () => {
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

    const options = mockToast.mock.calls.at(-1)?.[1] as {
      action: { onClick: () => void }
    }
    options.action.onClick()

    expect(mockOpenExternalUrl).toHaveBeenCalledWith(
      "https://github.com/vana-com/data-connect/releases/latest"
    )
    expect(mockToast.dismiss).toHaveBeenCalledWith("app-update-toast")
  })

  it("shows only one debug toast on initial debug mount", async () => {
    renderWithAppUpdateProvider(["/?appUpdateScenario=update-available"])

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledTimes(1)
    })
    expect(mockCheckAppUpdate).not.toHaveBeenCalled()
    expect(mockCheckForTauriAppUpdate).not.toHaveBeenCalled()
  })

  it("persists fallback same-version dismissal across checks", async () => {
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

    const options = mockToast.mock.calls.at(-1)?.[1] as {
      cancel: { onClick: () => void }
    }
    options.cancel.onClick()

    expect(
      localStorage.getItem("dataconnect_app_update_dismissed_version")
    ).toBe("1.2.4")

    fireEvent.click(screen.getByRole("button", { name: "Trigger check" }))

    await waitFor(() => {
      expect(mockCheckAppUpdate).toHaveBeenCalledTimes(2)
    })
    expect(mockToast).toHaveBeenCalledTimes(1)
  })
})
