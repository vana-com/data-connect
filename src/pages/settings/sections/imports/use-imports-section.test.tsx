import { beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react"
import { Provider } from "react-redux"
import { createMemoryRouter, RouterProvider, useLocation } from "react-router-dom"
import { ROUTES } from "@/config/routes"
import { setConnectedPlatforms, setPlatforms, setRuns, store } from "@/state/store"
import type { Platform, Run } from "@/types"
import { useImportsSection } from "./use-imports-section"

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}))

vi.mock("@/hooks/useConnector", () => ({
  useConnector: () => ({
    startImport: vi.fn(),
    stopExport: vi.fn(),
  }),
}))

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    isAuthenticated: false,
  }),
}))

vi.mock("@/hooks/usePersonalServer", () => ({
  usePersonalServer: () => ({
    status: "stopped",
    port: null,
    error: null,
  }),
}))

vi.mock("@/services/serverRegistration", () => ({
  fetchServerIdentity: vi.fn(() => Promise.resolve({ serverId: null })),
}))

function HookHarness() {
  const location = useLocation()
  const {
    activeImports,
    finishedImports,
    selectedSourceFilter,
    setSourceFilter,
    sourceFilterOptions,
  } = useImportsSection()

  return (
    <div>
      <button type="button" onClick={() => setSourceFilter("github")}>
        set github
      </button>
      <button type="button" onClick={() => setSourceFilter("all")}>
        set all
      </button>
      <div data-testid="search">{location.search}</div>
      <div data-testid="selected-filter">{selectedSourceFilter}</div>
      <div data-testid="active-count">{activeImports.length}</div>
      <div data-testid="finished-count">{finishedImports.length}</div>
      <div data-testid="option-count">{sourceFilterOptions.length}</div>
    </div>
  )
}

function buildRun(
  id: string,
  platformId: string,
  status: Run["status"],
  startDate: string
): Run {
  return {
    id,
    platformId,
    filename: `${platformId}-export.zip`,
    isConnected: true,
    startDate,
    status,
    url: `https://example.com/${platformId}`,
    company: platformId,
    name: platformId,
  }
}

const testPlatforms: Platform[] = [
  {
    id: "github",
    company: "GitHub",
    name: "GitHub",
    filename: "github",
    description: "GitHub export",
    isUpdated: false,
    logoURL: "",
    needsConnection: true,
    connectURL: null,
    connectSelector: null,
    exportFrequency: null,
    vectorize_config: null,
    runtime: null,
  },
  {
    id: "linkedin",
    company: "LinkedIn",
    name: "LinkedIn",
    filename: "linkedin",
    description: "LinkedIn export",
    isUpdated: false,
    logoURL: "",
    needsConnection: true,
    connectURL: null,
    connectSelector: null,
    exportFrequency: null,
    vectorize_config: null,
    runtime: null,
  },
]

const testRuns: Run[] = [
  buildRun("run-github-running", "github", "running", "2026-01-03T00:00:00.000Z"),
  buildRun("run-linkedin-success", "linkedin", "success", "2026-01-02T00:00:00.000Z"),
  buildRun("run-github-success", "github", "success", "2026-01-01T00:00:00.000Z"),
]

describe("useImportsSection source filter URL behavior", () => {
  beforeEach(() => {
    cleanup()
    store.dispatch(setPlatforms(testPlatforms))
    store.dispatch(setConnectedPlatforms({ github: true, linkedin: true }))
    store.dispatch(setRuns(testRuns))
  })

  it("applies source filter from URL when source is valid", async () => {
    const router = createMemoryRouter(
      [{ path: ROUTES.settings, element: <HookHarness /> }],
      {
        initialEntries: [`${ROUTES.settings}?section=imports&source=github`],
      }
    )

    const { getByTestId } = render(
      <Provider store={store}>
        <RouterProvider router={router} />
      </Provider>
    )

    await waitFor(() => {
      expect(getByTestId("selected-filter").textContent).toBe("github")
    })
    expect(getByTestId("active-count").textContent).toBe("1")
    expect(getByTestId("finished-count").textContent).toBe("1")
    expect(getByTestId("option-count").textContent).toBe("3")
  })

  it("falls back to all when URL source is invalid", async () => {
    const router = createMemoryRouter(
      [{ path: ROUTES.settings, element: <HookHarness /> }],
      {
        initialEntries: [`${ROUTES.settings}?section=imports&source=not-a-source`],
      }
    )

    const { getByTestId } = render(
      <Provider store={store}>
        <RouterProvider router={router} />
      </Provider>
    )

    await waitFor(() => {
      expect(getByTestId("selected-filter").textContent).toBe("all")
    })
    expect(getByTestId("active-count").textContent).toBe("1")
    expect(getByTestId("finished-count").textContent).toBe("2")
  })

  it("writes source param to URL and removes only source when switching back to all", async () => {
    const router = createMemoryRouter(
      [{ path: ROUTES.settings, element: <HookHarness /> }],
      {
        initialEntries: [`${ROUTES.settings}?section=imports`],
      }
    )

    const { getByRole, getByTestId } = render(
      <Provider store={store}>
        <RouterProvider router={router} />
      </Provider>
    )

    fireEvent.click(getByRole("button", { name: "set github" }))
    await waitFor(() => {
      expect(getByTestId("search").textContent).toBe("?section=imports&source=github")
    })

    fireEvent.click(getByRole("button", { name: "set all" }))
    await waitFor(() => {
      expect(getByTestId("search").textContent).toBe("?section=imports")
    })
  })
})
