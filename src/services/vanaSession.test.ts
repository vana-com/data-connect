import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Tauri's HTTP plugin is replaced by global fetch in tests. The service
// uses dynamic import; vi.mock needs to set a synchronous module shape.
vi.mock("@tauri-apps/plugin-http", () => ({
  fetch: (...args: unknown[]) =>
    (globalThis.fetch as (...args: unknown[]) => Promise<Response>)(...args),
}))

import {
  computeAccessTokenExpiresAt,
  discoverUserPersonalServer,
  pollForTokens,
  refreshAccessToken,
  startDeviceAuthorization,
  VanaDeviceFlowError,
} from "./vanaSession"

const HYDRA_PUBLIC = "https://oauth-dev.vana.org"

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal("fetch", vi.fn())
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe("startDeviceAuthorization", () => {
  it("posts to /oauth2/device/auth and returns the Hydra envelope", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          device_code: "dev-123",
          user_code: "ABCD-EFGH",
          verification_uri: `${HYDRA_PUBLIC}/oauth2/device/verify`,
          verification_uri_complete: `${HYDRA_PUBLIC}/oauth2/device/verify?user_code=ABCD-EFGH`,
          expires_in: 600,
          interval: 5,
        }),
        { status: 200 }
      )
    )
    const auth = await startDeviceAuthorization()
    expect(auth.device_code).toBe("dev-123")
    expect(auth.user_code).toBe("ABCD-EFGH")
    expect(vi.mocked(fetch)).toHaveBeenCalledOnce()
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(url).toContain("/oauth2/device/auth")
    expect((init as RequestInit).method).toBe("POST")
    expect(String((init as RequestInit).body)).toContain(
      "client_id=data-connect"
    )
  })

  it("throws on non-2xx response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("nope", { status: 500 })
    )
    await expect(startDeviceAuthorization()).rejects.toBeInstanceOf(
      VanaDeviceFlowError
    )
  })
})

describe("pollForTokens", () => {
  it("returns tokens when Hydra responds 200", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          access_token: "ory_at_test",
          refresh_token: "ory_rt_test",
          expires_in: 900,
          token_type: "Bearer",
        }),
        { status: 200 }
      )
    )
    const promise = pollForTokens({
      deviceCode: "dev-1",
      initialIntervalSeconds: 1,
      expiresInSeconds: 60,
    })
    await vi.advanceTimersByTimeAsync(0)
    const tokens = await promise
    expect(tokens.access_token).toBe("ory_at_test")
  })

  it("retries on authorization_pending and respects slow_down", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "authorization_pending" }), {
          status: 400,
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "slow_down" }), { status: 400 })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: "ory_at_ok",
            expires_in: 900,
            token_type: "Bearer",
          }),
          { status: 200 }
        )
      )
    const promise = pollForTokens({
      deviceCode: "dev-1",
      initialIntervalSeconds: 1,
      expiresInSeconds: 600,
    })
    // Advance through three poll cycles. Initial interval 1s, then slow_down adds 5s, then 6s, success.
    await vi.advanceTimersByTimeAsync(1000)
    await vi.advanceTimersByTimeAsync(6000)
    await vi.advanceTimersByTimeAsync(6000)
    const tokens = await promise
    expect(tokens.access_token).toBe("ory_at_ok")
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(3)
  })

  it("throws on access_denied", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "access_denied" }), { status: 400 })
    )
    await expect(
      pollForTokens({
        deviceCode: "dev-1",
        initialIntervalSeconds: 1,
        expiresInSeconds: 60,
      })
    ).rejects.toMatchObject({
      name: "VanaDeviceFlowError",
      code: "access_denied",
    })
  })

  it("throws on expired_token", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "expired_token" }), { status: 400 })
    )
    await expect(
      pollForTokens({
        deviceCode: "dev-1",
        initialIntervalSeconds: 1,
        expiresInSeconds: 60,
      })
    ).rejects.toMatchObject({ code: "expired_token" })
  })
})

describe("refreshAccessToken", () => {
  it("trades a refresh token for a new access token", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          access_token: "ory_at_new",
          refresh_token: "ory_rt_new",
          expires_in: 900,
          token_type: "Bearer",
        }),
        { status: 200 }
      )
    )
    const tokens = await refreshAccessToken("ory_rt_old")
    expect(tokens.access_token).toBe("ory_at_new")
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(url).toContain("/oauth2/token")
    expect(String((init as RequestInit).body)).toContain(
      "grant_type=refresh_token"
    )
    expect(String((init as RequestInit).body)).toContain(
      "refresh_token=ory_rt_old"
    )
  })

  it("throws on Hydra failure", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("invalid_grant", { status: 400 })
    )
    await expect(refreshAccessToken("bad-rt")).rejects.toBeInstanceOf(
      VanaDeviceFlowError
    )
  })
})

describe("discoverUserPersonalServer", () => {
  it("returns the running server URL", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [
            {
              id: "srv_x",
              url: "https://0xfake.myvana.app",
              state: "running",
            },
          ],
        }),
        { status: 200 }
      )
    )
    const ps = await discoverUserPersonalServer("ory_at_test")
    expect(ps).toEqual({ id: "srv_x", url: "https://0xfake.myvana.app" })
    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect(
      ((init as RequestInit).headers as Record<string, string>).authorization
    ).toBe("Bearer ory_at_test")
  })

  it("returns null when user has no PS", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ data: [] }), { status: 200 })
    )
    expect(await discoverUserPersonalServer("ory_at_test")).toBeNull()
  })

  it("throws on non-2xx", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("nope", { status: 500 })
    )
    await expect(discoverUserPersonalServer("ory_at_test")).rejects.toBeInstanceOf(
      VanaDeviceFlowError
    )
  })
})

describe("computeAccessTokenExpiresAt", () => {
  it("returns now + expires_in", () => {
    expect(computeAccessTokenExpiresAt(900, () => 1000)).toBe(1900)
  })
})
