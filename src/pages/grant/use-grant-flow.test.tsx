import { beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook, waitFor } from "@testing-library/react"
import { invoke } from "@tauri-apps/api/core"
import { DEFAULT_APP_ID, getDefaultAppEntry } from "../../apps/registry"
import { useGrantFlow } from "./use-grant-flow"

const mockApproveSession = vi.fn()
const mockGetSessionInfo = vi.fn()
const mockPrepareGrantMessage = vi.fn(() => ({}))
const mockSetConnectedApp = vi.fn()

let authState = {
  isAuthenticated: false,
  isLoading: false,
  walletAddress: null as string | null,
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

vi.mock("../../services/sessionRelay", () => ({
  approveSession: (...args: unknown[]) =>
    mockApproveSession.apply(null, args as []),
  getSessionInfo: (...args: unknown[]) =>
    mockGetSessionInfo.apply(null, args as []),
  SessionRelayError: class SessionRelayError extends Error {},
}))

vi.mock("../../services/grantSigning", () => ({
  prepareGrantMessage: (...args: unknown[]) =>
    mockPrepareGrantMessage.apply(null, args as []),
}))

vi.mock("../../lib/storage", () => ({
  setConnectedApp: (...args: unknown[]) =>
    mockSetConnectedApp.apply(null, args as []),
}))

beforeEach(() => {
  mockApproveSession.mockReset()
  mockGetSessionInfo.mockReset()
  mockPrepareGrantMessage.mockReset()
  mockPrepareGrantMessage.mockImplementation(() => ({}))
  mockSetConnectedApp.mockReset()
  authCompleteHandler = null
  delete tauriWindow.__TAURI__
  authState = {
    isAuthenticated: false,
    isLoading: false,
    walletAddress: null,
  }
})

describe("useGrantFlow", () => {
  it("uses registry defaults for demo sessions and respects scopes override", async () => {
    const { result } = renderHook(() =>
      useGrantFlow({
        sessionId: "grant-session-123",
        scopes: ["read:custom"],
      })
    )

    await waitFor(() => {
      expect(result.current.flowState.session).toBeDefined()
    })

    const session = result.current.flowState.session
    expect(session?.appId).toBe(DEFAULT_APP_ID)
    expect(session?.appName).toBe(getDefaultAppEntry().name)
    expect(session?.scopes).toEqual(["read:custom"])
    expect(result.current.flowState.status).toBe("consent")
    expect(result.current.currentStep).toBe(2)
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

    await act(async () => {
      await result.current.handleApprove()
    })

    await waitFor(() => {
      expect(result.current.flowState.status).toBe("auth-required")
    })
    expect(mockPrepareGrantMessage).not.toHaveBeenCalled()
    expect(mockedInvoke).toHaveBeenCalledWith("start_browser_auth", {
      privyAppId: expect.any(String),
      privyClientId: expect.any(String),
    })

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

    await waitFor(() => {
      expect(result.current.flowState.status).toBe("success")
    })
    expect(mockPrepareGrantMessage).toHaveBeenCalled()
    expect(mockSetConnectedApp).toHaveBeenCalled()
  })

  it("forces success when status is success", async () => {
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

  it("approves real sessions and stores connected app", async () => {
    authState = {
      isAuthenticated: true,
      isLoading: false,
      walletAddress: "0xabc",
    }

    mockGetSessionInfo.mockResolvedValue({
      id: "real-session-1",
      appId: "rickroll",
      appName: "RickRoll Facts",
      appIcon: "🎵",
      scopes: ["read:chatgpt-conversations"],
      expiresAt: "2030-01-01T00:00:00.000Z",
    })

    const { result } = renderHook(() =>
      useGrantFlow({
        sessionId: "real-session-1",
      })
    )

    await waitFor(() => {
      expect(result.current.flowState.status).toBe("consent")
    })

    await act(async () => {
      await result.current.handleApprove()
    })

    expect(mockApproveSession).toHaveBeenCalledWith({
      sessionId: "real-session-1",
      walletAddress: "0xabc",
      grantSignature: expect.any(String),
    })
    expect(mockSetConnectedApp).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "rickroll",
        name: "RickRoll Facts",
      })
    )
    expect(result.current.flowState.status).toBe("success")
  })
})
