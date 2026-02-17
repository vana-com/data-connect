import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { Grant } from "./index"

const mockUseGrantFlow = vi.fn()
const mockConsumePendingGrantPrefetch = vi.fn()

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

vi.mock("@/lib/pending-grant-prefetch", () => ({
  consumePendingGrantPrefetch: (...args: unknown[]) =>
    mockConsumePendingGrantPrefetch(...args),
}))

afterEach(() => {
  cleanup()
  mockUseGrantFlow.mockReset()
  mockConsumePendingGrantPrefetch.mockReset()
})

describe("Grant debug status switching", () => {
  it("consumes session-keyed prefetch cache and passes it into useGrantFlow", () => {
    const prefetched = {
      session: {
        id: "session-prefetch-1",
        granteeAddress: "0xprefetch",
        scopes: ["chatgpt.conversations"],
        expiresAt: "2030-01-01T00:00:00.000Z",
      },
      builderManifest: {
        name: "Prefetched Builder",
        appUrl: "https://prefetched.builder",
      },
    }
    mockConsumePendingGrantPrefetch.mockReturnValue(prefetched)
    mockUseGrantFlow.mockReturnValue({
      flowState: {
        sessionId: "session-prefetch-1",
        status: "consent",
        session: prefetched.session,
        builderManifest: prefetched.builderManifest,
      },
      isApproving: false,
      handleApprove: vi.fn(),
      handleDeny: vi.fn(),
      handleRetry: vi.fn(),
      declineHref: "https://example.com/deny",
      authLoading: false,
      builderName: "Prefetched Builder",
    })

    render(
      <MemoryRouter initialEntries={["/grant?sessionId=session-prefetch-1"]}>
        <Grant />
      </MemoryRouter>
    )

    expect(mockConsumePendingGrantPrefetch).toHaveBeenCalledWith("session-prefetch-1")
    expect(mockUseGrantFlow).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: "session-prefetch-1" }),
      prefetched
    )
  })

  it("keeps builder manifest links when toggling creating-grant back to consent", () => {
    mockConsumePendingGrantPrefetch.mockReturnValue(undefined)
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
