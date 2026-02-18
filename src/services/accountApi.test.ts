import { describe, expect, it, vi, beforeEach } from "vitest"
import { signMessage, signTypedData } from "./accountApi"

const mockFetch = vi.fn()

vi.mock("@tauri-apps/plugin-http", () => ({
  fetch: (...args: unknown[]) => mockFetch(...args),
}))

beforeEach(() => {
  mockFetch.mockReset()
})

describe("signMessage", () => {
  it("sends personal_sign request and returns signature", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ signature: "0xsig123" }),
    })

    const sig = await signMessage("0xmasterkey", "vana-master-key-v1")

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/sign"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          masterKeySignature: "0xmasterkey",
          message: "vana-master-key-v1",
          type: "personal_sign",
        }),
      })
    )
    expect(sig).toBe("0xsig123")
  })

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve("Unauthorized"),
    })

    await expect(signMessage("0xbad", "msg")).rejects.toThrow(
      "Sign failed (401): Unauthorized"
    )
  })
})

describe("signTypedData", () => {
  it("sends eth_signTypedData_v4 request and returns signature", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ signature: "0xtypedsig" }),
    })

    const typedData = {
      primaryType: "ServerRegistration",
      domain: { name: "Vana" },
      types: {},
      message: {},
    }

    const sig = await signTypedData("0xmasterkey", typedData)

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/sign"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          masterKeySignature: "0xmasterkey",
          typedData,
          type: "eth_signTypedData_v4",
        }),
      })
    )
    expect(sig).toBe("0xtypedsig")
  })

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve("Internal error"),
    })

    await expect(signTypedData("0xbad", {})).rejects.toThrow(
      "Sign failed (500): Internal error"
    )
  })
})
