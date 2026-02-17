import { describe, expect, it, vi } from "vitest"
import { resolveGrantBootstrap } from "./grant-flow-bootstrap"
import type { PrefetchedGrantData } from "./types"

const prefetched: PrefetchedGrantData = {
  session: {
    id: "session-1",
    granteeAddress: "0xbuilder",
    scopes: ["chatgpt.conversations"],
    expiresAt: "2030-01-01T00:00:00.000Z",
    webhookUrl: "https://builder.example.com/webhook",
  },
  builderManifest: {
    name: "Builder App",
    appUrl: "https://builder.example.com",
  },
}

describe("resolveGrantBootstrap", () => {
  it("uses fully prefetched data and skips claim/verify calls", async () => {
    const claimSession = vi.fn()
    const verifyBuilder = vi.fn()

    const result = await resolveGrantBootstrap(
      {
        sessionId: "session-1",
        secret: "secret-1",
        prefetched,
        isDemoSession: () => false,
        createDemoSession: () => {
          throw new Error("should not call createDemoSession")
        },
        createDemoBuilderManifest: () => {
          throw new Error("should not call createDemoBuilderManifest")
        },
      },
      { claimSession, verifyBuilder }
    )

    expect(result.session).toEqual(prefetched.session)
    expect(result.builderManifest).toEqual(prefetched.builderManifest)
    expect(claimSession).not.toHaveBeenCalled()
    expect(verifyBuilder).not.toHaveBeenCalled()
  })

  it("verifies builder when only session is prefetched", async () => {
    const claimSession = vi.fn()
    const verifyBuilder = vi.fn().mockResolvedValue({
      name: "Verified Builder",
      appUrl: "https://builder.example.com",
    })
    const onStatusChange = vi.fn()

    const result = await resolveGrantBootstrap(
      {
        sessionId: "session-2",
        secret: "secret-2",
        prefetched: { session: prefetched.session },
        isDemoSession: () => false,
        createDemoSession: () => {
          throw new Error("should not call createDemoSession")
        },
        createDemoBuilderManifest: () => {
          throw new Error("should not call createDemoBuilderManifest")
        },
        onStatusChange,
      },
      { claimSession, verifyBuilder }
    )

    expect(result.session).toEqual(prefetched.session)
    expect(result.builderManifest).toEqual({
      name: "Verified Builder",
      appUrl: "https://builder.example.com",
    })
    expect(claimSession).not.toHaveBeenCalled()
    expect(verifyBuilder).toHaveBeenCalledWith(
      "0xbuilder",
      "https://builder.example.com/webhook"
    )
    expect(onStatusChange).toHaveBeenCalledWith("verifying-builder")
  })

  it("throws when no secret is available for non-prefetched flow", async () => {
    const claimSession = vi.fn()
    const verifyBuilder = vi.fn()

    await expect(
      resolveGrantBootstrap(
        {
          sessionId: "session-3",
          isDemoSession: () => false,
          createDemoSession: () => {
            throw new Error("should not call createDemoSession")
          },
          createDemoBuilderManifest: () => {
            throw new Error("should not call createDemoBuilderManifest")
          },
        },
        { claimSession, verifyBuilder }
      )
    ).rejects.toThrow("No secret provided")

    expect(claimSession).not.toHaveBeenCalled()
    expect(verifyBuilder).not.toHaveBeenCalled()
  })
})
