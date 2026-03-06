import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { Grant } from "./index"

const mockUseGrantFlow = vi.fn()

vi.mock("./use-browser-status", () => ({
  useBrowserStatus: () => ({
    status: "ready",
    progress: 100,
    error: null,
    retry: vi.fn(),
    startDownload: vi.fn(),
  }),
}))

vi.mock("./use-grant-flow", () => ({
  useGrantFlow: (...args: unknown[]) => mockUseGrantFlow(...args),
}))

afterEach(() => {
  cleanup()
  mockUseGrantFlow.mockReset()
})

function mockGrantFlowResult() {
  mockUseGrantFlow.mockReturnValue({
    flowState: {
      sessionId: "session-1",
      status: "consent",
      session: {
        id: "session-1",
        granteeAddress: "0xgrantee",
        scopes: ["chatgpt.conversations"],
        expiresAt: "2030-01-01T00:00:00.000Z",
        appName: "Real App",
      },
      builderManifest: {
        name: "Real App",
        appUrl: "https://real.app",
        privacyPolicyUrl: "https://real.app/privacy",
        termsUrl: "https://real.app/terms",
        supportUrl: "https://real.app/support",
      },
    },
    isApproving: false,
    authUrl: null,
    authError: null,
    startBrowserAuth: vi.fn(),
    handleApprove: vi.fn(),
    handleDeny: vi.fn(),
    handleRetry: vi.fn(),
    declineHref: "https://example.com/deny",
    authLoading: false,
    builderName: "Real App",
  })
}

describe("Grant debug status switching", () => {
  it("keeps disclosure link when toggling creating-grant back to consent", () => {
    mockGrantFlowResult()

    render(
      <MemoryRouter initialEntries={["/grant?sessionId=session-1"]}>
        <Grant />
      </MemoryRouter>
    )

    expect(
      screen.getByRole("link", {
        name: "Data Extraction Risk & Responsibility Disclosure",
      })
    ).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Grant debug" }))
    fireEvent.click(screen.getByRole("button", { name: "creating-grant" }))
    fireEvent.click(screen.getByRole("button", { name: "consent" }))

    expect(
      screen.getByRole("link", {
        name: "Data Extraction Risk & Responsibility Disclosure",
      })
    ).toBeTruthy()
  })

  it("derives consent scopes from the debug scenario query param", () => {
    mockGrantFlowResult()

    render(
      <MemoryRouter
        initialEntries={["/grant?sessionId=session-1&grantStatus=consent&consentScopeScenario=5-linkedin"]}
      >
        <Grant />
      </MemoryRouter>
    )

    expect(
      screen.getByText(
        "See your LinkedIn experience, education, skills, languages, and profile"
      )
    ).toBeTruthy()
  })

  it("falls back to live consent scopes for invalid debug scenarios", () => {
    mockGrantFlowResult()

    render(
      <MemoryRouter
        initialEntries={["/grant?sessionId=session-1&grantStatus=consent&consentScopeScenario=invalid"]}
      >
        <Grant />
      </MemoryRouter>
    )

    expect(screen.getByText("See your ChatGPT Conversations")).toBeTruthy()
  })

  it("updates the consent UI when scope scenario buttons change URL-backed state", () => {
    mockGrantFlowResult()

    render(
      <MemoryRouter
        initialEntries={["/grant?sessionId=session-1&grantStatus=consent&consentScopeScenario=mixed"]}
      >
        <Grant />
      </MemoryRouter>
    )

    expect(screen.getByText("Allow access to your data")).toBeTruthy()
    expect(screen.getByText("See your LinkedIn Experience")).toBeTruthy()
    expect(screen.getByText("See your Spotify History")).toBeTruthy()
    expect(
      screen.getByText("See your ChatGPT conversations and memories")
    ).toBeTruthy()
    expect(screen.queryByText("See your ChatGPT Conversations")).toBeNull()
    expect(screen.queryByText("See your ChatGPT Memories")).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Grant debug" }))
    fireEvent.click(screen.getByRole("button", { name: "real" }))

    expect(screen.getByText("See your ChatGPT Conversations")).toBeTruthy()
    expect(screen.queryByText("See your LinkedIn Experience")).toBeNull()
    expect(screen.queryByText("See your Spotify History")).toBeNull()
  })
})
