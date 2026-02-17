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

describe("Grant debug status switching", () => {
  it("keeps builder manifest links when toggling creating-grant back to consent", () => {
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
      handleApprove: vi.fn(),
      handleDeny: vi.fn(),
      handleRetry: vi.fn(),
      declineHref: "https://example.com/deny",
      authLoading: false,
      builderName: "Real App",
    })

    render(
      <MemoryRouter initialEntries={["/grant?sessionId=session-1"]}>
        <Grant />
      </MemoryRouter>
    )

    expect(screen.getByRole("link", { name: "Privacy Policy" })).toBeTruthy()
    expect(screen.getByRole("link", { name: "Terms of Service" })).toBeTruthy()
    expect(screen.getByRole("link", { name: "Support" })).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "creating-grant" }))
    fireEvent.click(screen.getByRole("button", { name: "consent" }))

    expect(screen.getByRole("link", { name: "Privacy Policy" })).toBeTruthy()
    expect(screen.getByRole("link", { name: "Terms of Service" })).toBeTruthy()
    expect(screen.getByRole("link", { name: "Support" })).toBeTruthy()
  })
})
