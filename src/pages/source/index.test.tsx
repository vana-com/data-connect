import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
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
const mockOpenLocalPath = vi.fn()

vi.mock("react-redux", () => ({
  useSelector: (selector: (state: typeof mockState) => unknown) =>
    selector(mockState),
}))

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    canAccessDebugRuns: false,
  }),
}))

vi.mock("@/lib/tauri-paths", () => ({
  getUserDataPath: () => mockGetUserDataPath(),
  openPlatformExportFolder: (...args: unknown[]) =>
    mockOpenPlatformExportFolder(...args),
  loadLatestSourceExportPreview: (...args: unknown[]) =>
    mockLoadLatestSourceExportPreview(...args),
  loadLatestSourceExportFull: (...args: unknown[]) =>
    mockLoadLatestSourceExportFull(...args),
}))

vi.mock("@/lib/open-resource", () => ({
  openLocalPath: (...args: unknown[]) => mockOpenLocalPath(...args),
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
  mockGetUserDataPath.mockResolvedValue("/tmp/databridge")
  mockLoadLatestSourceExportFull.mockResolvedValue("{}")
  mockOpenLocalPath.mockResolvedValue(true)
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

  it("uses the same open handler for sidebar path and open file button", async () => {
    mockLoadLatestSourceExportPreview.mockResolvedValue({
      previewJson: "{\n  \"ok\": true\n}",
      isTruncated: false,
      filePath: "/tmp/databridge/exported_data/OpenAI/ChatGPT/chatgpt.json",
      fileSizeBytes: 2048,
      exportedAt: "2026-02-11T10:00:00.000Z",
    })
    mockOpenPlatformExportFolder.mockResolvedValue(undefined)

    renderSourcePage()

    const [openFileButton] = await screen.findAllByRole("button", {
      name: "Open file",
    })
    const [sourcePathLink] = await screen.findAllByRole("link", {
      name: "../exported_data/chatgpt",
    })

    fireEvent.click(openFileButton)
    fireEvent.click(sourcePathLink)

    await waitFor(() => {
      expect(mockOpenPlatformExportFolder).toHaveBeenCalledTimes(2)
    })
  })

  it("shows copy failed when clipboard fallback copy returns false", async () => {
    mockLoadLatestSourceExportPreview.mockResolvedValue({
      previewJson: "{\n  \"ok\": true\n}",
      isTruncated: false,
      filePath: "/tmp/databridge/exported_data/OpenAI/ChatGPT/chatgpt.json",
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
      const [copyButton] = await screen.findAllByRole("button", {
        name: "Copy full JSON",
      })
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
      filePath: "/tmp/databridge/exported_data/OpenAI/ChatGPT/chatgpt.json",
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
      const [copyButton] = await screen.findAllByRole("button", {
        name: "Copy full JSON",
      })
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
})
