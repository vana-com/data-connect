import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook, waitFor } from "@testing-library/react"
import * as authModule from "./auth"

const mockPrivy = vi.hoisted(() => ({
  mockLoginWithCode: vi.fn(),
  mockLogout: vi.fn(),
  mockInitialize: vi.fn(),
  mockSetMessagePoster: vi.fn(),
  mockGetAccessToken: vi.fn(),
  mockGetURL: vi.fn(() => "https://wallet.example/"),
  mockGetProvider: vi.fn(),
  mockProviderRequest: vi.fn(),
  mockEmailSendCode: vi.fn(),
  mockEmailLoginWithCode: vi.fn(),
  mockGenerateURL: vi.fn(),
  mockEmbeddedWalletCreate: vi.fn(),
  mockEmbeddedWalletOnMessage: vi.fn(),
}))

vi.mock("@privy-io/js-sdk-core", () => {
  class MockPrivyClient {
    auth = {
      logout: mockPrivy.mockLogout,
      oauth: {
        loginWithCode: mockPrivy.mockLoginWithCode,
        generateURL: mockPrivy.mockGenerateURL,
      },
      email: {
        sendCode: mockPrivy.mockEmailSendCode,
        loginWithCode: mockPrivy.mockEmailLoginWithCode,
      },
    }

    embeddedWallet = {
      getURL: mockPrivy.mockGetURL,
      getProvider: mockPrivy.mockGetProvider,
      create: mockPrivy.mockEmbeddedWalletCreate,
      onMessage: mockPrivy.mockEmbeddedWalletOnMessage,
    }

    setMessagePoster = mockPrivy.mockSetMessagePoster
    initialize = mockPrivy.mockInitialize
    getAccessToken = mockPrivy.mockGetAccessToken
  }

  class LocalStorage {}

  return { default: MockPrivyClient, LocalStorage }
})

const { scheduleCloseTab, useAuthPage } = authModule

const createDeferred = <T>() => {
  let resolve: (value: T) => void
  let reject: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve: resolve!, reject: reject! }
}

describe("scheduleCloseTab", () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it("requests close-tab before closing", () => {
    vi.useFakeTimers()
    const closeSpy = vi.fn()
    const requestSpy = vi.fn()

    scheduleCloseTab(10, { close: closeSpy, requestCloseTab: requestSpy })
    vi.runAllTimers()

    expect(closeSpy).toHaveBeenCalled()
    expect(requestSpy).toHaveBeenCalled()
    expect(requestSpy.mock.invocationCallOrder[0]).toBeLessThan(
      closeSpy.mock.invocationCallOrder[0]
    )
  })
})

describe("useAuthPage", () => {
  beforeEach(() => {
    mockPrivy.mockLoginWithCode.mockReset()
    mockPrivy.mockLogout.mockReset()
    mockPrivy.mockInitialize.mockReset()
    mockPrivy.mockSetMessagePoster.mockReset()
    mockPrivy.mockGetAccessToken.mockReset()
    mockPrivy.mockGetURL.mockReset()
    mockPrivy.mockGetProvider.mockReset()
    mockPrivy.mockProviderRequest.mockReset()
    mockPrivy.mockEmailSendCode.mockReset()
    mockPrivy.mockEmailLoginWithCode.mockReset()
    mockPrivy.mockGenerateURL.mockReset()
    mockPrivy.mockEmbeddedWalletCreate.mockReset()
    mockPrivy.mockEmbeddedWalletOnMessage.mockReset()
    mockPrivy.mockGetURL.mockReturnValue("https://wallet.example/")
    mockPrivy.mockGetProvider.mockResolvedValue({
      request: mockPrivy.mockProviderRequest.mockResolvedValue("0xdeadbeef"),
    })
    mockPrivy.mockEmbeddedWalletCreate.mockResolvedValue({
      user: {
        linked_accounts: [
          { type: "wallet", address: "0xabc", walletClientType: "privy" },
        ],
      },
    })
    ;(window as typeof window & { __AUTH_CONFIG__?: unknown }).__AUTH_CONFIG__ =
      {
        privyAppId: "app-id",
        privyClientId: "client-id",
      }
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    window.history.pushState({}, "", "/")
  })

  it("shows an error when auth callback fails and skips close-tab", async () => {
    window.history.pushState(
      {},
      "",
      "/?privy_oauth_code=code&privy_oauth_state=state"
    )

    const fetchSpy = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString()
      if (url.includes("/auth-callback")) {
        return { ok: false, status: 500 } as Response
      }
      return { ok: true, status: 200 } as Response
    })
    vi.stubGlobal("fetch", fetchSpy)

    const sessionDeferred = createDeferred<{
      user: {
        id: string
        email?: { address?: string | null } | null
        linked_accounts?: Array<{
          type: string
          address?: string
          walletClientType?: string
        }>
      }
    }>()
    mockPrivy.mockLoginWithCode.mockReturnValueOnce(sessionDeferred.promise)

    const scheduleSpy = vi.spyOn(authModule, "scheduleCloseTab")
    const { result } = renderHook(() => useAuthPage())

    await waitFor(() => {
      expect(mockPrivy.mockLoginWithCode).toHaveBeenCalled()
    })

    act(() => {
      const iframe = {
        contentWindow: {} as Window,
        addEventListener: vi.fn(),
      } as unknown as HTMLIFrameElement
      result.current.walletIframeRef.current = iframe
    })

    await act(async () => {
      sessionDeferred.resolve({
        user: {
          id: "user-1",
          email: { address: "user@example.com" },
          linked_accounts: [
            { type: "wallet", address: "0xabc", walletClientType: "privy" },
          ],
        },
      })
    })

    await waitFor(() => {
      expect(result.current.error).toBe(
        "Failed to return to the app. Please try again."
      )
    })

    expect(result.current.view).toBe("login")
    expect(scheduleSpy).not.toHaveBeenCalled()
  })

  it("sets the wallet message poster on iframe load", async () => {
    window.history.pushState({}, "", "/")

    const { result } = renderHook(() => useAuthPage())

    await waitFor(() => {
      expect(result.current.view).toBe("login")
    })

    const iframe = {
      contentWindow: {} as Window,
      addEventListener: vi.fn(),
    } as unknown as HTMLIFrameElement

    act(() => {
      result.current.walletIframeRef.current = iframe
      result.current.handleWalletIframeLoad()
    })

    expect(mockPrivy.mockSetMessagePoster).toHaveBeenCalledWith(
      iframe.contentWindow
    )
  })
})
