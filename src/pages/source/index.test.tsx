import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  cleanup,
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
const mockWriteAppQuickstartFiles = vi.fn()
const mockOpenExportFolderPath = vi.fn()
const mockOpenLocalPath = vi.fn()
const mockOpenExternalUrl = vi.fn()
const mockGenerateAiQuickstartArtifact = vi.fn()

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
  writeAppQuickstartFiles: (...args: unknown[]) =>
    mockWriteAppQuickstartFiles(...args),
}))

vi.mock("@/lib/open-resource", () => ({
  openExportFolderPath: (...args: unknown[]) =>
    mockOpenExportFolderPath(...args),
  openLocalPath: (...args: unknown[]) => mockOpenLocalPath(...args),
  openExternalUrl: (...args: unknown[]) => mockOpenExternalUrl(...args),
  toFileUrl: (path: string) => `file://${path}`,
}))

vi.mock("./app-quickstart-ai", () => ({
  generateAiQuickstartArtifact: (...args: unknown[]) =>
    mockGenerateAiQuickstartArtifact(...args),
}))

const renderSourcePage = (path = "/sources/chatgpt") => {
  const router = createMemoryRouter(
    [{ path: ROUTES.source, element: <SourceOverview /> }],
    {
      initialEntries: [path],
    }
  )

  return {
    ...render(<RouterProvider router={router} />),
    router,
  }
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
  mockLoadLatestSourceExportPreview.mockResolvedValue({
    previewJson: '{\n  "ok": true,\n  "messages": []\n}',
    isTruncated: false,
    filePath: "/tmp/dataconnect/exported_data/OpenAI/ChatGPT/chatgpt.json",
    fileSizeBytes: 2048,
    exportedAt: "2026-02-11T10:00:00.000Z",
  })
  mockLoadLatestSourceExportFull.mockResolvedValue("{}")
  mockWriteAppQuickstartFiles.mockResolvedValue(
    "/tmp/dataconnect/app_quickstarts/chatgpt/portfolio"
  )
  mockOpenExportFolderPath.mockResolvedValue(true)
  mockOpenLocalPath.mockResolvedValue(true)
  mockOpenExternalUrl.mockResolvedValue(true)
  mockGenerateAiQuickstartArtifact.mockResolvedValue({ status: "unavailable" })
})

afterEach(() => {
  cleanup()
})

describe("SourceOverview", () => {
  it("shows 404 when source route id is unknown", () => {
    renderSourcePage("/sources/not-a-source")

    expect(screen.getByText("404")).toBeTruthy()
    expect(
      screen.getByText("Source not found for route: not-a-source")
    ).toBeTruthy()
  })

  it("does not open quickstart for an invalid intent param", async () => {
    renderSourcePage("/sources/chatgpt?intent=not-create-app")

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /create app from chatgpt/i })
      ).toBeTruthy()
    })

    expect(
      screen.queryByRole("heading", { name: /create app from chatgpt/i })
    ).toBeNull()
  })

  it("opens create app from URL intent and clears only that param on close", async () => {
    const { router } = renderSourcePage(
      "/sources/chatgpt?intent=create-app&foo=bar"
    )

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /create app from chatgpt/i })
      ).toBeTruthy()
    })

    fireEvent.click(screen.getAllByRole("button", { name: "Close" })[0]!)

    await waitFor(() => {
      expect(router.state.location.search).toBe("?foo=bar")
    })
  })

  it("opens create app from the source overview action", async () => {
    const { router } = renderSourcePage()

    fireEvent.click(
      await screen.findByRole("button", { name: /create app from chatgpt/i })
    )

    await waitFor(() => {
      expect(router.state.location.search).toBe("?intent=create-app")
      expect(
        screen.getByRole("heading", { name: /create app from chatgpt/i })
      ).toBeTruthy()
    })
  })

  it("keeps the generate action disabled until an app idea is entered", async () => {
    renderSourcePage("/sources/chatgpt?intent=create-app")

    const generateButton = await screen.findByRole("button", {
      name: "Generate quickstart",
    })
    expect(generateButton.hasAttribute("disabled")).toBe(true)

    fireEvent.change(screen.getByLabelText("What do you want to make?"), {
      target: { value: "A searchable conversation explorer" },
    })

    expect(generateButton.hasAttribute("disabled")).toBe(false)
  })

  it("builds a fallback quickstart artifact and copies a source-aware prompt", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    const originalClipboard = navigator.clipboard
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    })

    try {
      renderSourcePage("/sources/chatgpt?intent=create-app")

      await screen.findByText(/"messages"/)

      fireEvent.change(screen.getByLabelText("What do you want to make?"), {
        target: { value: "A searchable conversation explorer" },
      })
      fireEvent.click(
        screen.getByRole("button", { name: "Generate quickstart" })
      )

      await waitFor(() => {
        expect(screen.getByText(/local fallback artifact/i)).toBeTruthy()
        expect(screen.getByRole("button", { name: "Copy prompt" })).toBeTruthy()
        expect(
          screen.getByRole("button", { name: "Reveal handoff files" })
        ).toBeTruthy()
      })

      fireEvent.click(screen.getByRole("button", { name: "Copy prompt" }))

      await waitFor(() => {
        expect(writeText).toHaveBeenCalledWith(
          expect.stringContaining("Build a local-first starter app")
        )
        expect(writeText).toHaveBeenCalledWith(
          expect.stringContaining("ChatGPT (chatgpt)")
        )
        expect(writeText).toHaveBeenCalledWith(
          expect.stringContaining(
            "/tmp/dataconnect/exported_data/OpenAI/ChatGPT/chatgpt.json"
          )
        )
      })
    } finally {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: originalClipboard,
      })
    }
  })

  it("writes quickstart handoff files into the dedicated folder before revealing them", async () => {
    renderSourcePage("/sources/chatgpt?intent=create-app")

    fireEvent.change(screen.getByLabelText("What do you want to make?"), {
      target: { value: "A portfolio site" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Generate quickstart" }))

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Reveal handoff files" })
      ).toBeTruthy()
    })

    fireEvent.click(
      screen.getByRole("button", { name: "Reveal handoff files" })
    )

    await waitFor(() => {
      expect(mockWriteAppQuickstartFiles).toHaveBeenCalledWith(
        "chatgpt",
        "A portfolio site",
        expect.stringContaining("# A portfolio site quickstart from ChatGPT"),
        expect.stringContaining('"id": "chatgpt"')
      )
      expect(mockOpenLocalPath).toHaveBeenCalledWith(
        "/tmp/dataconnect/app_quickstarts/chatgpt/portfolio"
      )
    })
  })

  it("shows the starter app as a separate adjacent action when there is one exact live match", async () => {
    mockState = {
      app: {
        runs: [],
        platforms: [
          {
            id: "spotify-playwright",
            company: "Spotify",
            name: "Spotify",
          },
        ],
      },
    }
    mockLoadLatestSourceExportPreview.mockResolvedValue({
      previewJson: '{\n  "playlists": []\n}',
      isTruncated: false,
      filePath: "/tmp/dataconnect/exported_data/Spotify/Spotify/spotify.json",
      fileSizeBytes: 4096,
      exportedAt: "2026-02-11T10:00:00.000Z",
    })

    renderSourcePage("/sources/spotify?intent=create-app")

    const starterAppButton = await screen.findByRole("button", {
      name: "Open Keep Me Weekly",
    })

    expect(screen.getByText("Starter app")).toBeTruthy()
    fireEvent.click(starterAppButton)

    await waitFor(() => {
      expect(mockOpenExternalUrl).toHaveBeenCalledWith(
        "https://vana-keep-me-weekly.vercel.app/"
      )
    })
    expect(
      screen.getByRole("heading", { name: /create app from spotify/i })
    ).toBeTruthy()
  })

  it("opens exports folder from preview card action", async () => {
    renderSourcePage()

    fireEvent.click(await screen.findByRole("button", { name: "Open Folder" }))

    await waitFor(() => {
      expect(mockOpenExportFolderPath).toHaveBeenCalledWith(
        "/tmp/dataconnect/exported_data/OpenAI/ChatGPT/chatgpt.json"
      )
    })
  })

  it("shows a back-to-home link and import history link in the sidebar", async () => {
    mockState = {
      app: {
        runs: [
          {
            id: "run-1",
            platformId: "chatgpt-playwright",
            startDate: "2026-02-11T10:00:00.000Z",
            status: "success",
            syncedToPersonalServer: true,
          },
        ],
        platforms: [
          {
            id: "chatgpt-playwright",
            company: "OpenAI",
            name: "ChatGPT",
          },
        ],
      },
    }

    const view = renderSourcePage()
    const scoped = within(view.container)
    const backLink = await scoped.findByRole("link", {
      name: /back to home|^home$/i,
    })

    expect(backLink.getAttribute("href")).toBe(ROUTES.home)
    expect(
      scoped.getAllByRole("link", { name: /import history/i }).length
    ).toBeGreaterThan(0)
  })
})
