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

const { mockCheckAppUpdate, mockOpenExternalUrl, mockToast } = vi.hoisted(
  () => ({
    mockCheckAppUpdate: vi.fn(),
    mockOpenExternalUrl: vi.fn(),
    mockToast: Object.assign(vi.fn(), { dismiss: vi.fn() }),
  })
)

vi.mock("@/hooks/app-update/check-app-update", () => ({
  checkAppUpdate: (...args: unknown[]) => mockCheckAppUpdate(...args),
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

describe("AppUpdateProvider", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it("shows update toast when a newer version is found", async () => {
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

  it("shows only one debug toast on initial debug mount", async () => {
    renderWithAppUpdateProvider(["/?appUpdateScenario=update-available"])

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledTimes(1)
    })
    expect(mockCheckAppUpdate).toHaveBeenCalledTimes(1)
  })

  it("dismisses update and suppresses same version", async () => {
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
    expect(mockToast).toHaveBeenCalledTimes(1)
  })

  it("re-shows toast for a newer version after dismissal", async () => {
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

  it("re-shows dismissed same-version toast on manual check", async () => {
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

  it("opens release URL when update now is clicked", async () => {
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
