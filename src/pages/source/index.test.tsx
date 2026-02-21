import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { ROUTES } from "@/config/routes"
import { SourceOverview } from "./index"

let mockState: {
  app: {
    runs: Array<Record<string, unknown>>
    platforms: Array<Record<string, unknown>>
  }
}

const mockGetUserDataPath = vi.fn()
const mockOpenPlatformExportFolder = vi.fn()
const mockLoadLatestSourceExportPreview = vi.fn()
const mockLoadLatestSourceExportFull = vi.fn()
const mockOpenExportFolderPath = vi.fn()
const mockClearExportedDataCache = vi.fn()

vi.mock("react-redux", () => ({
  useSelector: (selector: (state: typeof mockState) => unknown) =>
    selector(mockState),
}))

vi.mock("@/lib/tauri-paths", () => ({
  getUserDataPath: () => mockGetUserDataPath(),
  openPlatformExportFolder: (...args: unknown[]) =>
    mockOpenPlatformExportFolder(...args),
  loadLatestSourceExportPreview: (...args: unknown[]) =>
    mockLoadLatestSourceExportPreview(...args),
  loadLatestSourceExportFull: (...args: unknown[]) =>
    mockLoadLatestSourceExportFull(...args),
  clearExportedDataCache: (...args: unknown[]) =>
    mockClearExportedDataCache(...args),
}))

vi.mock("@/lib/open-resource", () => ({
  openExportFolderPath: (...args: unknown[]) =>
    mockOpenExportFolderPath(...args),
  toFileUrl: (path: string) => `file://${path}`,
}))

const renderSourcePage = (path = "/sources/chatgpt") => {
  const router = createMemoryRouter(
    [{ path: ROUTES.source, element: <SourceOverview /> }],
    {
      initialEntries: [path],
    }
  )
  return render(<RouterProvider router={router} />)
}

const findCopyButton = async () => {
  await waitFor(() => {
    const hasCopyButton = screen
      .getAllByRole("button")
      .some(button => button.textContent?.includes("Copy"))
    expect(hasCopyButton).toBe(true)
  })
  return screen
    .getAllByRole("button")
    .find(button => button.textContent?.includes("Copy")) as HTMLButtonElement
}

beforeEach(() => {
  vi.clearAllMocks()
  mockState = {
    app: {
      runs: [],
      platforms: [
        {
          id: "chatgpt-playwright",
          company: "OpenAI",
          name: "ChatGPT",
        },
      ],
    },
  }
  mockGetUserDataPath.mockResolvedValue("/tmp/dataconnect")
  mockLoadLatestSourceExportFull.mockResolvedValue("{}")
  mockOpenExportFolderPath.mockResolvedValue(true)
  mockClearExportedDataCache.mockResolvedValue(undefined)
})

describe("SourceOverview", () => {
  it("shows 404 when source route id is unknown", () => {
    renderSourcePage("/sources/not-a-source")

    expect(screen.getByText("404")).toBeTruthy()
    expect(
      screen.getByText("Source not found for route: not-a-source")
    ).toBeTruthy()
  })

  it("shows fallback preview in browser when tauri preview loading fails", async () => {
    mockLoadLatestSourceExportPreview.mockRejectedValue(new Error("IPC unavailable"))

    renderSourcePage()

    await waitFor(() => {
      expect(
        screen.getByText(/Local browser fallback preview/i)
      ).toBeTruthy()
    })
  })

  it("opens exports folder from sidebar action", async () => {
    mockLoadLatestSourceExportPreview.mockResolvedValue({
      previewJson: "{\n  \"ok\": true\n}",
      isTruncated: false,
      filePath: "/tmp/dataconnect/exported_data/OpenAI/ChatGPT/chatgpt.json",
      fileSizeBytes: 2048,
      exportedAt: "2026-02-11T10:00:00.000Z",
    })
    mockOpenPlatformExportFolder.mockResolvedValue(undefined)

    renderSourcePage()

    const [sourcePathLink] = await screen.findAllByRole("link", {
      name: "Open exports folder",
    })

    fireEvent.click(sourcePathLink)

    await waitFor(() => {
      expect(mockOpenPlatformExportFolder).toHaveBeenCalledTimes(1)
    })
  })

  it("shows a back-to-home link in the sidebar", async () => {
    const view = renderSourcePage()
    const scoped = within(view.container)
    const backLink = await scoped.findByRole("link", { name: "Back to Home" })
    expect(backLink.getAttribute("href")).toBe(ROUTES.home)
  })

  it("shows copy failed when clipboard fallback copy returns false", async () => {
    mockLoadLatestSourceExportPreview.mockResolvedValue({
      previewJson: "{\n  \"ok\": true\n}",
      isTruncated: false,
      filePath: "/tmp/dataconnect/exported_data/OpenAI/ChatGPT/chatgpt.json",
      fileSizeBytes: 2048,
      exportedAt: "2026-02-11T10:00:00.000Z",
    })
    mockLoadLatestSourceExportFull.mockResolvedValue("{\"ok\":true}")

    const originalClipboard = navigator.clipboard
    const originalExecCommand = document.execCommand

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn().mockRejectedValue(new Error("clipboard denied")),
      },
    })
    document.execCommand = vi.fn(() => false)

    try {
      renderSourcePage()
      const copyButton = await findCopyButton()
      fireEvent.click(copyButton)

      await waitFor(() => {
        expect(
          screen.getAllByRole("button", { name: "Copy failed" }).length
        ).toBeTruthy()
      })
    } finally {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: originalClipboard,
      })
      document.execCommand = originalExecCommand
    }
  })

  it("shows copied when clipboard write succeeds", async () => {
    mockLoadLatestSourceExportPreview.mockResolvedValue({
      previewJson: "{\n  \"ok\": true\n}",
      isTruncated: false,
      filePath: "/tmp/dataconnect/exported_data/OpenAI/ChatGPT/chatgpt.json",
      fileSizeBytes: 2048,
      exportedAt: "2026-02-11T10:00:00.000Z",
    })
    mockLoadLatestSourceExportFull.mockResolvedValue("{\"ok\":true}")

    const originalClipboard = navigator.clipboard
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })

    try {
      renderSourcePage()
      const copyButton = await findCopyButton()
      fireEvent.click(copyButton)

      await waitFor(() => {
        expect(
          screen.getAllByRole("button", { name: "Copied" }).length
        ).toBeTruthy()
      })
    } finally {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: originalClipboard,
      })
    }
  })

  it("keeps copy button enabled when source platform is unavailable", async () => {
    mockState = {
      app: {
        runs: [],
        platforms: [],
      },
    }

    const originalClipboard = navigator.clipboard
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })

    try {
      renderSourcePage()
      const copyButton = await findCopyButton()
      expect(copyButton.hasAttribute("disabled")).toBe(false)

      fireEvent.click(copyButton)
      await waitFor(() => {
        expect(screen.getAllByRole("button", { name: "Copied" }).length).toBe(1)
      })
    } finally {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: originalClipboard,
      })
    }
  })

  it(
    "shows reset cache success and returns to idle label after timeout",
    async () => {
      mockLoadLatestSourceExportPreview.mockResolvedValue({
        previewJson: "{\n  \"ok\": true\n}",
        isTruncated: false,
        filePath: "/tmp/dataconnect/exported_data/OpenAI/ChatGPT/chatgpt.json",
        fileSizeBytes: 2048,
        exportedAt: "2026-02-11T10:00:00.000Z",
      })

      const view = renderSourcePage()
      const scoped = within(view.container)
      const [resetButton] = await scoped.findAllByRole("button", {
        name: "Reset cache",
      })
      fireEvent.click(resetButton)

      await waitFor(
        () => {
          expect(scoped.getAllByRole("button", { name: "Cache reset" }).length).toBe(
            1
          )
        },
        { timeout: 3_000 }
      )

      await act(async () => {
        await new Promise(resolve => window.setTimeout(resolve, 1_300))
      })

      await waitFor(() => {
        expect(scoped.getAllByRole("button", { name: "Reset cache" }).length).toBe(1)
      })
    },
    12_000
  )
})
