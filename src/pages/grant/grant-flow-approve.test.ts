import { describe, expect, it, vi } from "vitest"
import { executeGrantApproval } from "./grant-flow-approve"
import type { GrantFlowState } from "./types"

const baseFlowState: GrantFlowState = {
  sessionId: "session-1",
  secret: "secret-1",
  status: "consent",
  session: {
    id: "session-1",
    granteeAddress: "0xbuilder",
    scopes: ["chatgpt.conversations"],
    expiresAt: "2030-01-01T00:00:00.000Z",
  },
}

describe("executeGrantApproval", () => {
  it("runs grant approval side effects in order", async () => {
    const events: string[] = []
    const createGrant = vi.fn().mockImplementation(async () => {
      events.push("createGrant")
      return { grantId: "grant-1" }
    })
    const fetchServerIdentity = vi.fn().mockImplementation(async () => {
      events.push("fetchServerIdentity")
      return { address: "0xserver", publicKey: "pk", serverId: null }
    })
    const savePendingApproval = vi.fn().mockImplementation(() => {
      events.push("savePendingApproval")
    })
    const approveSession = vi.fn().mockImplementation(async () => {
      events.push("approveSession")
    })
    const clearPendingApproval = vi.fn().mockImplementation(() => {
      events.push("clearPendingApproval")
    })

    const result = await executeGrantApproval(
      {
        flowState: baseFlowState,
        walletAddress: "0xuser",
        personalServerPort: 8080,
        personalServerDevToken: "dev-token",
      },
      {
        createGrant,
        fetchServerIdentity,
        savePendingApproval,
        approveSession,
        clearPendingApproval,
      }
    )

    expect(result).toEqual({ grantId: "grant-1", serverAddress: "0xserver" })
    expect(events).toEqual([
      "createGrant",
      "fetchServerIdentity",
      "savePendingApproval",
      "approveSession",
      "clearPendingApproval",
    ])
  })

  it("retains pending approval when approveSession fails", async () => {
    const createGrant = vi.fn().mockResolvedValue({ grantId: "grant-1" })
    const fetchServerIdentity = vi.fn().mockResolvedValue({
      address: "0xserver",
      publicKey: "pk",
      serverId: null,
    })
    const savePendingApproval = vi.fn()
    const approveSession = vi
      .fn()
      .mockRejectedValue(new Error("session relay unavailable"))
    const clearPendingApproval = vi.fn()

    await expect(
      executeGrantApproval(
        {
          flowState: baseFlowState,
          walletAddress: "0xuser",
          personalServerPort: 8080,
          personalServerDevToken: "dev-token",
        },
        {
          createGrant,
          fetchServerIdentity,
          savePendingApproval,
          approveSession,
          clearPendingApproval,
        }
      )
    ).rejects.toThrow("session relay unavailable")

    expect(savePendingApproval).toHaveBeenCalledTimes(1)
    expect(approveSession).toHaveBeenCalledTimes(1)
    expect(clearPendingApproval).not.toHaveBeenCalled()
  })

  it("throws when flow state secret is missing", async () => {
    const createGrant = vi.fn().mockResolvedValue({ grantId: "grant-1" })
    const fetchServerIdentity = vi.fn().mockResolvedValue({
      address: "0xserver",
      publicKey: "pk",
      serverId: null,
    })
    const savePendingApproval = vi.fn()
    const approveSession = vi.fn()
    const clearPendingApproval = vi.fn()

    await expect(
      executeGrantApproval(
        {
          flowState: { ...baseFlowState, secret: undefined },
          walletAddress: "0xuser",
          personalServerPort: 8080,
          personalServerDevToken: "dev-token",
        },
        {
          createGrant,
          fetchServerIdentity,
          savePendingApproval,
          approveSession,
          clearPendingApproval,
        }
      )
    ).rejects.toThrow("secret is missing")

    expect(savePendingApproval).not.toHaveBeenCalled()
    expect(approveSession).not.toHaveBeenCalled()
    expect(clearPendingApproval).not.toHaveBeenCalled()
  })
})
