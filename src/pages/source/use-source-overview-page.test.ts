import { beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook, waitFor } from "@testing-library/react"
import { useSourceOverviewPage } from "./use-source-overview-page"

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
  clearExportedDataCache: (...args: unknown[]) =>
    mockClearExportedDataCache(...args),
}))

vi.mock("@/lib/open-resource", () => ({
  openExportFolderPath: (...args: unknown[]) => mockOpenExportFolderPath(...args),
  toFileUrl: (path: string) => `file://${path}`,
}))

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
  mockLoadLatestSourceExportPreview.mockResolvedValue({
    previewJson: "{\n  \"ok\": true\n}",
    isTruncated: false,
    filePath: "/tmp/dataconnect/exported_data/OpenAI/ChatGPT/chatgpt.json",
    fileSizeBytes: 2048,
    exportedAt: "2026-02-11T10:00:00.000Z",
  })
  mockLoadLatestSourceExportFull.mockResolvedValue("{\"ok\":true}")
  mockOpenExportFolderPath.mockResolvedValue(true)
  mockOpenPlatformExportFolder.mockResolvedValue(undefined)
  mockClearExportedDataCache.mockResolvedValue(undefined)
})

describe("useSourceOverviewPage", () => {
  it("falls back to local path open when platform folder open fails", async () => {
    mockOpenPlatformExportFolder.mockRejectedValue(new Error("open failed"))

    const { result } = renderHook(() => useSourceOverviewPage("chatgpt"))

    await waitFor(() => {
      expect(result.current.openSourcePath).toBeTruthy()
    })

    await act(async () => {
      await result.current.handleOpenSourcePath()
    })

    expect(mockOpenExportFolderPath).toHaveBeenCalled()
  })

  it("sets copy status to error when clipboard copy fails", async () => {
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
      const { result } = renderHook(() => useSourceOverviewPage("chatgpt"))

      await waitFor(() => {
        expect(result.current.sourceEntry?.id).toBe("chatgpt")
      })

      await act(async () => {
        await result.current.handleCopyFullJson()
      })

      expect(result.current.copyStatus).toBe("error")
    } finally {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: originalClipboard,
      })
      document.execCommand = originalExecCommand
    }
  })

  it("copies fallback JSON when source platform is unavailable", async () => {
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
      const { result } = renderHook(() => useSourceOverviewPage("chatgpt"))

      await waitFor(() => {
        expect(result.current.sourcePlatform).toBe(null)
      })

      await act(async () => {
        await result.current.handleCopyFullJson()
      })

      expect(result.current.copyStatus).toBe("copied")
      expect(mockLoadLatestSourceExportFull).not.toHaveBeenCalled()
    } finally {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: originalClipboard,
      })
    }
  })

  it("resets copy status back to idle after feedback timeout", async () => {
    const originalClipboard = navigator.clipboard
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })

    try {
      const { result } = renderHook(() => useSourceOverviewPage("chatgpt"))

      await waitFor(() => {
        expect(result.current.sourceEntry?.id).toBe("chatgpt")
      })

      await act(async () => {
        await result.current.handleCopyFullJson()
      })

      expect(result.current.copyStatus).toBe("copied")

      await waitFor(
        () => {
          expect(result.current.copyStatus).toBe("idle")
        },
        { timeout: 2_500 }
      )
    } finally {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: originalClipboard,
      })
    }
  })

  it("suppresses preview error in non-tauri runtime", async () => {
    mockLoadLatestSourceExportPreview.mockRejectedValue(new Error("IPC unavailable"))

    const { result } = renderHook(() => useSourceOverviewPage("chatgpt"))

    await waitFor(() => {
      expect(result.current.isPreviewLoading).toBe(false)
    })

    expect(result.current.previewError).toBe(null)
    expect(result.current.preview).toBe(null)
  })

  it("surfaces preview error in tauri runtime", async () => {
    mockLoadLatestSourceExportPreview.mockRejectedValue(new Error("IPC unavailable"))

    const hadTauri = "__TAURI__" in window
    const previousTauri = (window as { __TAURI__?: unknown }).__TAURI__
    Object.defineProperty(window, "__TAURI__", {
      configurable: true,
      value: {},
    })

    try {
      const { result } = renderHook(() => useSourceOverviewPage("chatgpt"))

      await waitFor(() => {
        expect(result.current.isPreviewLoading).toBe(false)
      })

      expect(result.current.previewError).toBe("IPC unavailable")
      expect(result.current.preview).toBe(null)
    } finally {
      if (hadTauri) {
        Object.defineProperty(window, "__TAURI__", {
          configurable: true,
          value: previousTauri,
        })
      } else {
        delete (window as { __TAURI__?: unknown }).__TAURI__
      }
    }
  })

  it(
    "resets cache status back to idle after success timeout",
    async () => {
    const { result } = renderHook(() => useSourceOverviewPage("chatgpt"))

    await waitFor(() => {
      expect(result.current.sourceEntry?.id).toBe("chatgpt")
    })

    await act(async () => {
      await result.current.handleResetExportedDataCache()
    })

    expect(result.current.resetCacheStatus).toBe("success")

    await waitFor(
      () => {
        expect(result.current.resetCacheStatus).toBe("idle")
      },
      { timeout: 6_000 }
    )
    },
    12_000
  )

  it("sets reset cache status to error when cache clearing fails", async () => {
    mockClearExportedDataCache.mockRejectedValue(new Error("permission denied"))
    const { result } = renderHook(() => useSourceOverviewPage("chatgpt"))

    await waitFor(() => {
      expect(result.current.sourceEntry?.id).toBe("chatgpt")
    })

    await act(async () => {
      await result.current.handleResetExportedDataCache()
    })

    expect(result.current.resetCacheStatus).toBe("error")
  })
})
