import { beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook, waitFor } from "@testing-library/react"
import { invoke } from "@tauri-apps/api/core"
import { useGrantFlow } from "./use-grant-flow"

const mockNavigate = vi.fn()
const mockClaimSession = vi.fn()
const mockApproveSession = vi.fn()
const mockDenySession = vi.fn()
const mockVerifyBuilder = vi.fn()
const mockCreateGrant = vi.fn()
const mockFetchServerIdentity = vi.fn()
const mockSavePendingApproval = vi.fn()
const mockClearPendingApproval = vi.fn()

let authState = {
  isAuthenticated: false,
  isLoading: false,
  walletAddress: null as string | null,
}

let personalServerState = {
  status: "stopped" as string,
  port: null as number | null,
  tunnelUrl: null as string | null,
  tunnelFailed: false,
  devToken: null as string | null,
  error: null as string | null,
  startServer: vi.fn(),
  stopServer: vi.fn(),
  restartServer: vi.fn(),
  restartingRef: { current: false },
}

let authCompleteHandler: ((event: { payload: any }) => void) | null = null
const tauriWindow = window as Window & { __TAURI__?: unknown; __TAURI_INTERNALS__?: unknown }

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}))

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(
    (eventName: string, handler: (event: { payload: any }) => void) => {
      if (eventName === "auth-complete") {
        authCompleteHandler = handler
      }
      return Promise.resolve(() => {})
    }
  ),
}))

vi.mock("react-redux", () => ({
  useDispatch: () => vi.fn(),
}))

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => authState,
}))

vi.mock("../../hooks/usePersonalServer", () => ({
  usePersonalServer: () => personalServerState,
}))

vi.mock("../../services/sessionRelay", () => ({
  claimSession: (...args: unknown[]) =>
    mockClaimSession.apply(null, args as []),
  approveSession: (...args: unknown[]) =>
    mockApproveSession.apply(null, args as []),
  denySession: (...args: unknown[]) =>
    mockDenySession.apply(null, args as []),
  SessionRelayError: class SessionRelayError extends Error {},
}))

vi.mock("../../services/builder", () => ({
  verifyBuilder: (...args: unknown[]) =>
    mockVerifyBuilder.apply(null, args as []),
  BuilderVerificationError: class BuilderVerificationError extends Error {
    constructor(message: string) {
      super(message)
      this.name = "BuilderVerificationError"
    }
  },
}))

vi.mock("../../services/personalServer", () => ({
  createGrant: (...args: unknown[]) =>
    mockCreateGrant.apply(null, args as []),
  PersonalServerError: class PersonalServerError extends Error {},
}))

vi.mock("../../services/serverRegistration", () => ({
  fetchServerIdentity: (...args: unknown[]) =>
    mockFetchServerIdentity.apply(null, args as []),
}))

vi.mock("../../lib/storage", () => ({
  savePendingApproval: (...args: unknown[]) =>
    mockSavePendingApproval.apply(null, args as []),
  clearPendingApproval: (...args: unknown[]) =>
    mockClearPendingApproval.apply(null, args as []),
}))

beforeEach(() => {
  mockNavigate.mockReset()
  mockClaimSession.mockReset()
  mockApproveSession.mockReset()
  mockDenySession.mockReset()
  mockVerifyBuilder.mockReset()
  mockCreateGrant.mockReset()
  mockFetchServerIdentity.mockReset()
  mockSavePendingApproval.mockReset()
  mockClearPendingApproval.mockReset()
  mockFetchServerIdentity.mockResolvedValue({ address: "0xserver", publicKey: "pk", serverId: null })
  authCompleteHandler = null
  delete tauriWindow.__TAURI__
  delete tauriWindow.__TAURI_INTERNALS__
  authState = {
    isAuthenticated: false,
    isLoading: false,
    walletAddress: null,
  }
  personalServerState = {
    status: "running",
    port: 8080,
    tunnelUrl: "https://test.server.vana.org",
    tunnelFailed: false,
    devToken: "test-dev-token",
    error: null,
    startServer: vi.fn(),
    stopServer: vi.fn(),
    restartServer: vi.fn(),
    restartingRef: { current: false },
  }
})

describe("useGrantFlow", () => {
  it("uses demo session data for grant-session-* IDs", async () => {
    const { result } = renderHook(() =>
      useGrantFlow({
        sessionId: "grant-session-123",
      })
    )

    await waitFor(() => {
      expect(result.current.flowState.session).toBeDefined()
    })

    const session = result.current.flowState.session
    expect(session?.granteeAddress).toBe(
      "0x0000000000000000000000000000000000000000"
    )
    expect(session?.scopes).toEqual(["chatgpt.conversations"])
    expect(result.current.flowState.status).toBe("consent")
    expect(result.current.builderName).toBe("Demo App")
  })

  it("starts auth only after approval and auto-approves on auth completion", async () => {
    tauriWindow.__TAURI_INTERNALS__ = {}
    const mockedInvoke = vi.mocked(invoke)
    mockedInvoke.mockResolvedValue("https://auth.vana.test")

    const { result, rerender } = renderHook(() =>
      useGrantFlow({
        sessionId: "grant-session-456",
      })
    )

    await waitFor(() => {
      expect(result.current.flowState.status).toBe("consent")
    })

    // Click Allow while not authenticated → should go to auth-required
    await act(async () => {
      await result.current.handleApprove()
    })

    await waitFor(() => {
      expect(result.current.flowState.status).toBe("auth-required")
    })
    expect(mockedInvoke).toHaveBeenCalledWith("start_browser_auth", {
      privyAppId: expect.any(String),
      privyClientId: expect.any(String),
    })

    // Simulate auth completion
    await act(async () => {
      authState = {
        isAuthenticated: true,
        isLoading: false,
        walletAddress: "0xabc",
      }
      authCompleteHandler?.({
        payload: {
          success: true,
          user: { id: "user-1", email: "test@vana.org" },
          walletAddress: "0xabc",
        },
      })
      rerender()
    })

    // Demo sessions skip grant creation → go straight to success
    await waitFor(() => {
      expect(result.current.flowState.status).toBe("success")
    })
  })

  it("waits for Personal Server port and tunnel before auto-approving after auth", async () => {
    // Start with server still starting (port and tunnel null)
    personalServerState = {
      ...personalServerState,
      status: "starting",
      port: null,
      tunnelUrl: null,
      devToken: "test-dev-token",
    }

    tauriWindow.__TAURI_INTERNALS__ = {}
    const mockedInvoke = vi.mocked(invoke)
    mockedInvoke.mockResolvedValue("https://auth.vana.test")

    // Use pre-fetched data for a real (non-demo) session to skip claim+verify
    const prefetched = {
      session: {
        id: "race-session-1",
        granteeAddress: "0xbuilder",
        scopes: ["chatgpt.conversations"],
        expiresAt: "2030-01-01T00:00:00.000Z",
      },
      builderManifest: {
        name: "Race Test Builder",
        appUrl: "https://race.example.com",
        privacyPolicyUrl: "https://race.example.com/privacy",
      },
    }

    mockCreateGrant.mockResolvedValue({ grantId: "grant-race-1" })

    const { result, rerender } = renderHook(() =>
      useGrantFlow(
        { sessionId: "race-session-1", secret: "race-secret" },
        prefetched,
      ),
    )

    await waitFor(() => {
      expect(result.current.flowState.status).toBe("consent")
    })

    // Click Allow while not authenticated → auth-required
    await act(async () => {
      await result.current.handleApprove()
    })

    await waitFor(() => {
      expect(result.current.flowState.status).toBe("auth-required")
    })

    // Simulate auth completion (server port still null)
    await act(async () => {
      authState = {
        isAuthenticated: true,
        isLoading: false,
        walletAddress: "0xuser",
      }
      authCompleteHandler?.({
        payload: {
          success: true,
          user: { id: "user-1", email: "test@vana.org" },
          walletAddress: "0xuser",
        },
      })
      rerender()
    })

    // Auto-approve should NOT have fired — server port is still null
    expect(mockCreateGrant).not.toHaveBeenCalled()
    // Status should transition to preparing-server (not stay on auth-required)
    expect(result.current.flowState.status).toBe("preparing-server")

    // Simulate server port becoming ready (but tunnel still null)
    await act(async () => {
      personalServerState = {
        ...personalServerState,
        status: "running",
        port: 8080,
        tunnelUrl: null,
      }
      rerender()
    })

    // Auto-approve should still NOT have fired — tunnel is not ready
    expect(mockCreateGrant).not.toHaveBeenCalled()
    expect(result.current.flowState.status).toBe("preparing-server")

    // Simulate tunnel becoming ready
    await act(async () => {
      personalServerState = {
        ...personalServerState,
        tunnelUrl: "https://test.server.vana.org",
      }
      rerender()
    })

    // Now auto-approve should proceed and complete
    await waitFor(() => {
      expect(result.current.flowState.status).toBe("success")
    })

    expect(mockCreateGrant).toHaveBeenCalledWith(
      8080,
      {
        granteeAddress: "0xbuilder",
        scopes: ["chatgpt.conversations"],
        expiresAt: 1893456000,
      },
      "test-dev-token",
    )
  })

  it("auth_complete_event_applies_once_per_auth_cycle", async () => {
    tauriWindow.__TAURI_INTERNALS__ = {}
    const mockedInvoke = vi.mocked(invoke)
    mockedInvoke.mockResolvedValue("https://auth.vana.test")

    const prefetched = {
      session: {
        id: "auth-once-session-1",
        granteeAddress: "0xbuilder",
        scopes: ["chatgpt.conversations"],
        expiresAt: "2030-01-01T00:00:00.000Z",
      },
      builderManifest: {
        name: "Auth Once Builder",
        appUrl: "https://auth-once.example.com",
        privacyPolicyUrl: "https://auth-once.example.com/privacy",
      },
    }

    mockCreateGrant.mockResolvedValue({ grantId: "grant-auth-once-1" })

    const { result, rerender } = renderHook(() =>
      useGrantFlow(
        { sessionId: "auth-once-session-1", secret: "auth-once-secret" },
        prefetched,
      ),
    )

    await waitFor(() => {
      expect(result.current.flowState.status).toBe("consent")
    })

    await act(async () => {
      await result.current.handleApprove()
    })

    await waitFor(() => {
      expect(result.current.flowState.status).toBe("auth-required")
    })

    await act(async () => {
      authState = {
        isAuthenticated: true,
        isLoading: false,
        walletAddress: "0xauthonce",
      }
      authCompleteHandler?.({
        payload: {
          success: true,
          user: { id: "user-1", email: "test@vana.org" },
          walletAddress: "0xauthonce",
        },
      })
      authCompleteHandler?.({
        payload: {
          success: true,
          user: { id: "user-1", email: "test@vana.org" },
          walletAddress: "0xauthonce",
        },
      })
      rerender()
    })

    await waitFor(() => {
      expect(result.current.flowState.status).toBe("success")
    })

    expect(mockCreateGrant).toHaveBeenCalledTimes(1)
    expect(mockApproveSession).toHaveBeenCalledTimes(1)
    expect(mockClearPendingApproval).toHaveBeenCalledTimes(1)
  })

  it("forces success when status param is success", async () => {
    const { result } = renderHook(() =>
      useGrantFlow({
        sessionId: "grant-session-789",
        status: "success",
      })
    )

    await waitFor(() => {
      expect(result.current.flowState.status).toBe("success")
    })
  })

  it("claims and verifies builder for real sessions", async () => {
    mockClaimSession.mockResolvedValue({
      sessionId: "real-session-1",
      granteeAddress: "0xbuilder",
      scopes: ["chatgpt.conversations"],
      expiresAt: "2030-01-01T00:00:00.000Z",
    })
    mockVerifyBuilder.mockResolvedValue({
      name: "RickRoll Facts",
      appUrl: "https://rickroll.example.com",
      privacyPolicyUrl: "https://rickroll.example.com/privacy",
    })

    const { result } = renderHook(() =>
      useGrantFlow({
        sessionId: "real-session-1",
        secret: "test-secret",
      })
    )

    await waitFor(() => {
      expect(result.current.flowState.status).toBe("consent")
    })

    expect(mockClaimSession).toHaveBeenCalledWith({
      sessionId: "real-session-1",
      secret: "test-secret",
    })
    expect(mockVerifyBuilder).toHaveBeenCalledWith("0xbuilder", undefined)

    const session = result.current.flowState.session
    expect(session?.granteeAddress).toBe("0xbuilder")
    expect(session?.scopes).toEqual(["chatgpt.conversations"])
    expect(result.current.builderName).toBe("RickRoll Facts")
  })

  it("approval pipeline persists then clears pending approval on success", async () => {
    authState = {
      isAuthenticated: true,
      isLoading: false,
      walletAddress: "0xuser",
    }

    mockClaimSession.mockResolvedValue({
      sessionId: "real-session-2",
      granteeAddress: "0xbuilder",
      scopes: ["chatgpt.conversations"],
      expiresAt: "2030-01-01T00:00:00.000Z",
    })
    mockVerifyBuilder.mockResolvedValue({
      name: "Test Builder",
      appUrl: "https://test.example.com",
    })
    mockCreateGrant.mockResolvedValue({ grantId: "grant-123" })

    const { result } = renderHook(() =>
      useGrantFlow({
        sessionId: "real-session-2",
        secret: "test-secret",
      })
    )

    await waitFor(() => {
      expect(result.current.flowState.status).toBe("consent")
    })

    await act(async () => {
      await result.current.handleApprove()
    })

    await waitFor(() => {
      expect(result.current.flowState.status).toBe("success")
    })

    expect(mockCreateGrant).toHaveBeenCalledWith(8080, {
      granteeAddress: "0xbuilder",
      scopes: ["chatgpt.conversations"],
      expiresAt: 1893456000,
    }, "test-dev-token")
    expect(mockApproveSession).toHaveBeenCalledWith("real-session-2", {
      secret: "test-secret",
      grantId: "grant-123",
      userAddress: "0xuser",
      serverAddress: "0xserver",
      scopes: ["chatgpt.conversations"],
    })
    expect(mockSavePendingApproval).toHaveBeenCalledWith({
      sessionId: "real-session-2",
      grantId: "grant-123",
      userAddress: "0xuser",
      serverAddress: "0xserver",
      scopes: ["chatgpt.conversations"],
      createdAt: expect.any(String),
    })
    expect(mockClearPendingApproval).toHaveBeenCalledTimes(1)
  })

  it("errors when no secret is provided for non-demo session", async () => {
    const { result } = renderHook(() =>
      useGrantFlow({
        sessionId: "real-session-3",
        // no secret
      })
    )

    await waitFor(() => {
      expect(result.current.flowState.status).toBe("error")
    })
    expect(result.current.flowState.error).toContain("No secret provided")
  })

  it("skips claim + verify when pre-fetched data is provided", async () => {
    // When the connect page pre-fetched session + builder data in the background,
    // the grant flow should skip straight to consent without calling claim/verify.
    const prefetched = {
      session: {
        id: "prefetch-session-1",
        granteeAddress: "0xprefetchbuilder",
        scopes: ["chatgpt.conversations"],
        expiresAt: "2030-01-01T00:00:00.000Z",
      },
      builderManifest: {
        name: "Pre-fetched Builder",
        appUrl: "https://prefetched.example.com",
        privacyPolicyUrl: "https://prefetched.example.com/privacy",
      },
    }

    const { result } = renderHook(() =>
      useGrantFlow(
        {
          sessionId: "prefetch-session-1",
          secret: "prefetch-secret",
        },
        prefetched
      )
    )

    await waitFor(() => {
      expect(result.current.flowState.status).toBe("consent")
    })

    // Claim and verify should NOT have been called — data was pre-fetched
    expect(mockClaimSession).not.toHaveBeenCalled()
    expect(mockVerifyBuilder).not.toHaveBeenCalled()

    // Pre-fetched data should be in state
    expect(result.current.flowState.session?.granteeAddress).toBe("0xprefetchbuilder")
    expect(result.current.builderName).toBe("Pre-fetched Builder")
  })

  it("verifies builder but skips claim when only pre-fetched session is provided", async () => {
    const prefetched = {
      session: {
        id: "prefetch-session-only-1",
        granteeAddress: "0xsessiononlybuilder",
        scopes: ["chatgpt.conversations"],
        expiresAt: "2030-01-01T00:00:00.000Z",
        webhookUrl: "https://builder.example.com/webhook",
      },
    }

    mockVerifyBuilder.mockResolvedValue({
      name: "Session Only Builder",
      appUrl: "https://session-only.example.com",
      privacyPolicyUrl: "https://session-only.example.com/privacy",
    })

    const { result } = renderHook(() =>
      useGrantFlow(
        {
          sessionId: "prefetch-session-only-1",
          secret: "prefetch-secret",
        },
        prefetched
      )
    )

    await waitFor(() => {
      expect(result.current.flowState.status).toBe("consent")
    })

    expect(mockClaimSession).not.toHaveBeenCalled()
    expect(mockVerifyBuilder).toHaveBeenCalledWith(
      "0xsessiononlybuilder",
      "https://builder.example.com/webhook",
    )
    expect(result.current.builderName).toBe("Session Only Builder")
  })

  it("handles deny flow — calls deny API and navigates to apps", async () => {
    mockClaimSession.mockResolvedValue({
      sessionId: "deny-session-1",
      granteeAddress: "0xbuilder",
      scopes: ["chatgpt.conversations"],
      expiresAt: "2030-01-01T00:00:00.000Z",
    })
    mockVerifyBuilder.mockResolvedValue({
      name: "Test Builder",
      appUrl: "https://test.example.com",
    })

    const { result } = renderHook(() =>
      useGrantFlow({
        sessionId: "deny-session-1",
        secret: "deny-secret",
      })
    )

    await waitFor(() => {
      expect(result.current.flowState.status).toBe("consent")
    })

    await act(async () => {
      await result.current.handleDeny()
    })

    expect(mockDenySession).toHaveBeenCalledWith("deny-session-1", {
      secret: "deny-secret",
      reason: "User declined",
    })
    expect(mockNavigate).toHaveBeenCalledWith("/apps")
  })

  it("shows error when session claim fails", async () => {
    const { SessionRelayError } = await import("../../services/sessionRelay")
    mockClaimSession.mockRejectedValue(
      new SessionRelayError("Session not found", "SESSION_NOT_FOUND", 404)
    )

    const { result } = renderHook(() =>
      useGrantFlow({
        sessionId: "fail-session-1",
        secret: "test-secret",
      })
    )

    await waitFor(() => {
      expect(result.current.flowState.status).toBe("error")
    })
    expect(result.current.flowState.error).toBe("Session not found")
  })

  it("errors when builder verification fails (protocol spec MUST)", async () => {
    const { BuilderVerificationError } = await import("../../services/builder")
    mockClaimSession.mockResolvedValue({
      granteeAddress: "0xfailbuilder",
      scopes: ["chatgpt.conversations"],
      expiresAt: "2030-01-01T00:00:00.000Z",
    })
    mockVerifyBuilder.mockRejectedValue(
      new BuilderVerificationError("Builder app at https://example.com is unreachable")
    )

    const { result } = renderHook(() =>
      useGrantFlow({
        sessionId: "verify-fail-1",
        secret: "test-secret",
      })
    )

    // Per protocol spec: "MUST NOT render the consent screen and MUST fail the session flow"
    await waitFor(() => {
      expect(result.current.flowState.status).toBe("error")
    })
    expect(result.current.flowState.error).toBe(
      "Builder app at https://example.com is unreachable"
    )
  })

  it("shows error when grant creation fails", async () => {
    authState = {
      isAuthenticated: true,
      isLoading: false,
      walletAddress: "0xuser",
    }

    mockClaimSession.mockResolvedValue({
      granteeAddress: "0xbuilder",
      scopes: ["chatgpt.conversations"],
      expiresAt: "2030-01-01T00:00:00.000Z",
    })
    mockVerifyBuilder.mockResolvedValue({
      name: "Test Builder",
      appUrl: "https://test.example.com",
    })
    const { PersonalServerError } = await import(
      "../../services/personalServer"
    )
    mockCreateGrant.mockRejectedValue(
      new PersonalServerError("Server signer not available")
    )

    const { result } = renderHook(() =>
      useGrantFlow({
        sessionId: "grant-fail-1",
        secret: "test-secret",
      })
    )

    await waitFor(() => {
      expect(result.current.flowState.status).toBe("consent")
    })

    await act(async () => {
      await result.current.handleApprove()
    })

    await waitFor(() => {
      expect(result.current.flowState.status).toBe("error")
    })
    expect(result.current.flowState.error).toBe(
      "Server signer not available"
    )
  })

  it("navigates away even when deny API call fails", async () => {
    mockClaimSession.mockResolvedValue({
      granteeAddress: "0xbuilder",
      scopes: ["chatgpt.conversations"],
      expiresAt: "2030-01-01T00:00:00.000Z",
    })
    mockVerifyBuilder.mockResolvedValue({
      name: "Test Builder",
      appUrl: "https://test.example.com",
    })
    mockDenySession.mockRejectedValue(new Error("Network timeout"))

    const { result } = renderHook(() =>
      useGrantFlow({
        sessionId: "deny-fail-1",
        secret: "deny-secret",
      })
    )

    await waitFor(() => {
      expect(result.current.flowState.status).toBe("consent")
    })

    await act(async () => {
      await result.current.handleDeny()
    })

    // Should still navigate away despite deny call failure
    expect(mockNavigate).toHaveBeenCalledWith("/apps")
  })

  it("errors when secret is missing during approve for non-demo session", async () => {
    authState = {
      isAuthenticated: true,
      isLoading: false,
      walletAddress: "0xuser",
    }

    // Use pre-fetched data to bypass the initial claim (which would error on missing secret)
    const prefetched = {
      session: {
        id: "no-secret-session",
        granteeAddress: "0xbuilder",
        scopes: ["chatgpt.conversations"],
        expiresAt: "2030-01-01T00:00:00.000Z",
      },
      builderManifest: {
        name: "Test Builder",
        appUrl: "https://test.example.com",
      },
    }
    mockCreateGrant.mockResolvedValue({ grantId: "grant-999" })

    const { result } = renderHook(() =>
      useGrantFlow(
        {
          sessionId: "no-secret-session",
          // no secret
        },
        prefetched
      )
    )

    await waitFor(() => {
      expect(result.current.flowState.status).toBe("consent")
    })

    await act(async () => {
      await result.current.handleApprove()
    })

    await waitFor(() => {
      expect(result.current.flowState.status).toBe("error")
    })
    expect(result.current.flowState.error).toContain("secret is missing")
  })

  it("calls denySession when canceling from auth-required state", async () => {
    mockClaimSession.mockResolvedValue({
      granteeAddress: "0xbuilder",
      scopes: ["chatgpt.conversations"],
      expiresAt: "2030-01-01T00:00:00.000Z",
    })
    mockVerifyBuilder.mockResolvedValue({
      name: "Test Builder",
      appUrl: "https://test.example.com",
    })

    const { result } = renderHook(() =>
      useGrantFlow({
        sessionId: "auth-cancel-1",
        secret: "auth-cancel-secret",
      })
    )

    await waitFor(() => {
      expect(result.current.flowState.status).toBe("consent")
    })

    // Click Allow while not authenticated → transitions to auth-required
    await act(async () => {
      await result.current.handleApprove()
    })

    await waitFor(() => {
      expect(result.current.flowState.status).toBe("auth-required")
    })

    // Cancel from auth-required — should call denySession and navigate away
    await act(async () => {
      await result.current.handleDeny()
    })

    expect(mockDenySession).toHaveBeenCalledWith("auth-cancel-1", {
      secret: "auth-cancel-secret",
      reason: "User declined",
    })
    expect(mockNavigate).toHaveBeenCalledWith("/apps")
  })

  it("retries the flow from error state via handleRetry", async () => {
    // First call fails, second call succeeds
    mockClaimSession
      .mockRejectedValueOnce(new Error("Network timeout"))
      .mockResolvedValueOnce({
        granteeAddress: "0xbuilder",
        scopes: ["chatgpt.conversations"],
        expiresAt: "2030-01-01T00:00:00.000Z",
      })
    mockVerifyBuilder.mockResolvedValue({
      name: "Retry Builder",
      appUrl: "https://retry.example.com",
    })

    const { result } = renderHook(() =>
      useGrantFlow({
        sessionId: "retry-session-1",
        secret: "retry-secret",
      })
    )

    // First attempt should fail
    await waitFor(() => {
      expect(result.current.flowState.status).toBe("error")
    })

    // Retry should re-run the flow
    await act(async () => {
      result.current.handleRetry()
    })

    await waitFor(() => {
      expect(result.current.flowState.status).toBe("consent")
    })

    expect(mockClaimSession).toHaveBeenCalledTimes(2)
    expect(result.current.builderName).toBe("Retry Builder")
  })

  it("errors when session has expired (client-side check)", async () => {
    authState = {
      isAuthenticated: true,
      isLoading: false,
      walletAddress: "0xuser",
    }

    // Session with an already-expired expiresAt
    const prefetched = {
      session: {
        id: "expired-session-1",
        granteeAddress: "0xbuilder",
        scopes: ["chatgpt.conversations"],
        expiresAt: "2020-01-01T00:00:00.000Z", // in the past
      },
      builderManifest: {
        name: "Test Builder",
        appUrl: "https://test.example.com",
      },
    }

    const { result } = renderHook(() =>
      useGrantFlow(
        {
          sessionId: "expired-session-1",
          secret: "test-secret",
        },
        prefetched
      )
    )

    await waitFor(() => {
      expect(result.current.flowState.status).toBe("consent")
    })

    await act(async () => {
      await result.current.handleApprove()
    })

    await waitFor(() => {
      expect(result.current.flowState.status).toBe("error")
    })
    expect(result.current.flowState.error).toContain("expired")
    // Grant creation should not have been attempted
    expect(mockCreateGrant).not.toHaveBeenCalled()
  })

  it("shows error when Personal Server has failed to start", async () => {
    authState = {
      isAuthenticated: true,
      isLoading: false,
      walletAddress: "0xuser",
    }
    personalServerState = {
      ...personalServerState,
      status: "error",
      port: null,
      tunnelUrl: null,
      error: "Personal Server failed to start.",
    }

    mockClaimSession.mockResolvedValue({
      granteeAddress: "0xbuilder",
      scopes: ["chatgpt.conversations"],
      expiresAt: "2030-01-01T00:00:00.000Z",
    })
    mockVerifyBuilder.mockResolvedValue({
      name: "Test Builder",
      appUrl: "https://test.example.com",
    })

    const { result } = renderHook(() =>
      useGrantFlow({
        sessionId: "no-server-1",
        secret: "test-secret",
      })
    )

    await waitFor(() => {
      expect(result.current.flowState.status).toBe("consent")
    })

    // handleApprove defers when port is null; the auto-approve effect
    // then surfaces the error because personalServer.status is "error"
    await act(async () => {
      await result.current.handleApprove()
    })

    await waitFor(() => {
      expect(result.current.flowState.status).toBe("error")
    })
    expect(result.current.flowState.error).toContain(
      "Personal Server failed to start"
    )
  })

  it("waits during Phase 2 restart even if tunnelFailed is stale from Phase 1", async () => {
    // Phase 1 tunnel failed, but server is restarting for Phase 2.
    // The auto-approve effect should wait (not error) because restartingRef is true.
    authState = {
      isAuthenticated: true,
      isLoading: false,
      walletAddress: "0xuser",
    }
    personalServerState = {
      ...personalServerState,
      status: "starting",
      port: null,
      tunnelUrl: null,
      tunnelFailed: true,
      restartingRef: { current: true },
    }

    const prefetched = {
      session: {
        id: "restart-session",
        granteeAddress: "0xbuilder",
        scopes: ["chatgpt.conversations"],
        expiresAt: "2030-01-01T00:00:00.000Z",
      },
      builderManifest: {
        name: "Test Builder",
        appUrl: "https://test.example.com",
        privacyPolicyUrl: "https://test.example.com/privacy",
      },
    }

    mockCreateGrant.mockResolvedValue({ grantId: "grant-restart-1" })

    const { result, rerender } = renderHook(() =>
      useGrantFlow(
        { sessionId: "restart-session", secret: "test-secret" },
        prefetched,
      ),
    )

    await waitFor(() => {
      expect(result.current.flowState.status).toBe("consent")
    })

    // handleApprove defers because port+tunnel are null
    await act(async () => {
      await result.current.handleApprove()
    })

    // Should NOT show tunnel error — restartingRef guards against stale tunnelFailed
    expect(result.current.flowState.status).not.toBe("error")

    // Simulate Phase 2 restart completing: server ready, tunnel connected
    await act(async () => {
      personalServerState = {
        ...personalServerState,
        status: "running",
        port: 8080,
        tunnelUrl: "https://restarted.server.vana.org",
        tunnelFailed: false,
        restartingRef: { current: false },
      }
      rerender()
    })

    // Now auto-approve should proceed
    await waitFor(() => {
      expect(result.current.flowState.status).toBe("success")
    })
    expect(mockCreateGrant).toHaveBeenCalled()
  })

  it("shows error after 90s tunnel timeout, not on tunnelFailed alone", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })

    authState = {
      isAuthenticated: true,
      isLoading: false,
      walletAddress: "0xuser",
    }
    personalServerState = {
      ...personalServerState,
      status: "running",
      port: 8080,
      tunnelUrl: null,
      tunnelFailed: true,
    }

    const prefetched = {
      session: {
        id: "tunnel-fail-session",
        granteeAddress: "0xbuilder",
        scopes: ["chatgpt.conversations"],
        expiresAt: "2030-01-01T00:00:00.000Z",
      },
      builderManifest: {
        name: "Test Builder",
        appUrl: "https://test.example.com",
        privacyPolicyUrl: "https://test.example.com/privacy",
      },
    }

    const { result } = renderHook(() =>
      useGrantFlow(
        {
          sessionId: "tunnel-fail-session",
          secret: "test-secret",
        },
        prefetched
      )
    )

    await waitFor(() => {
      expect(result.current.flowState.status).toBe("consent")
    })

    // handleApprove defers because tunnelUrl is null
    await act(async () => {
      await result.current.handleApprove()
    })

    // tunnelFailed is true but the effect should NOT immediately error —
    // it keeps waiting in "preparing-server" for a late tunnel-success event.
    expect(result.current.flowState.status).toBe("preparing-server")
    expect(mockCreateGrant).not.toHaveBeenCalled()

    // Advance past the 90s timeout
    await act(async () => {
      vi.advanceTimersByTime(91_000)
    })

    // NOW the error should surface
    await waitFor(() => {
      expect(result.current.flowState.status).toBe("error")
    })
    expect(result.current.flowState.error).toContain("tunnel")
    expect(mockCreateGrant).not.toHaveBeenCalled()

    vi.useRealTimers()
  })
})
