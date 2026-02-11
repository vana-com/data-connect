import { beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook, waitFor } from "@testing-library/react"
import { invoke } from "@tauri-apps/api/core"
import { useGrantFlow } from "./use-grant-flow"

const mockClaimSession = vi.fn()
const mockApproveSession = vi.fn()
const mockDenySession = vi.fn()
const mockVerifyBuilder = vi.fn()
const mockCreateGrant = vi.fn()

let authState = {
  isAuthenticated: false,
  isLoading: false,
  walletAddress: null as string | null,
}

let personalServerState = {
  status: "stopped" as string,
  port: null as number | null,
  tunnelUrl: null as string | null,
  error: null as string | null,
  startServer: vi.fn(),
  stopServer: vi.fn(),
}

let authCompleteHandler: ((event: { payload: any }) => void) | null = null
const tauriWindow = window as Window & { __TAURI__?: unknown }

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
}))

vi.mock("../../services/personalServer", () => ({
  createGrant: (...args: unknown[]) =>
    mockCreateGrant.apply(null, args as []),
  PersonalServerError: class PersonalServerError extends Error {},
}))

beforeEach(() => {
  mockClaimSession.mockReset()
  mockApproveSession.mockReset()
  mockDenySession.mockReset()
  mockVerifyBuilder.mockReset()
  mockCreateGrant.mockReset()
  authCompleteHandler = null
  delete tauriWindow.__TAURI__
  authState = {
    isAuthenticated: false,
    isLoading: false,
    walletAddress: null,
  }
  personalServerState = {
    status: "running",
    port: 8080,
    tunnelUrl: null,
    error: null,
    startServer: vi.fn(),
    stopServer: vi.fn(),
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
    expect(result.current.currentStep).toBe(3)
  })

  it("starts auth only after approval and auto-approves on auth completion", async () => {
    tauriWindow.__TAURI__ = {}
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
    expect(mockVerifyBuilder).toHaveBeenCalledWith("0xbuilder")

    const session = result.current.flowState.session
    expect(session?.granteeAddress).toBe("0xbuilder")
    expect(session?.scopes).toEqual(["chatgpt.conversations"])
    expect(result.current.builderName).toBe("RickRoll Facts")
  })

  it("creates grant and approves real sessions", async () => {
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
      expiresAt: "2030-01-01T00:00:00.000Z",
    })
    expect(mockApproveSession).toHaveBeenCalledWith("real-session-2", {
      secret: "test-secret",
      grantId: "grant-123",
      userAddress: "0xuser",
      scopes: ["chatgpt.conversations"],
    })
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

  it("handles deny flow", async () => {
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
    expect(result.current.flowState.status).toBe("denied")
  })
})
