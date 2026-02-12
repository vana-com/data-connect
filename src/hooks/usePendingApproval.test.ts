import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { usePendingApprovalRetry } from "./usePendingApproval"
import * as storage from "../lib/storage"
import * as sessionRelay from "../services/sessionRelay"

vi.mock("../services/sessionRelay", () => ({
  approveSession: vi.fn(),
}))

describe("usePendingApprovalRetry", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it("does nothing when there is no pending approval", async () => {
    renderHook(() => usePendingApprovalRetry())

    // Should not call approveSession
    expect(sessionRelay.approveSession).not.toHaveBeenCalled()
  })

  it("retries approve and clears pending on success", async () => {
    const pending: storage.PendingApproval = {
      sessionId: "sess-retry",
      grantId: "grant-retry",
      secret: "secret-retry",
      userAddress: "0xabc",
      scopes: ["chatgpt.conversations"],
      createdAt: new Date().toISOString(),
    }

    storage.savePendingApproval(pending)
    ;(sessionRelay.approveSession as Mock).mockResolvedValue(undefined)

    const consoleSpy = vi.spyOn(console, "info").mockImplementation(() => {})

    renderHook(() => usePendingApprovalRetry())

    await waitFor(() => {
      expect(sessionRelay.approveSession).toHaveBeenCalledWith("sess-retry", {
        secret: "secret-retry",
        grantId: "grant-retry",
        userAddress: "0xabc",
        scopes: ["chatgpt.conversations"],
      })
    })

    // Should have cleared the pending approval
    expect(storage.getPendingApproval()).toBeNull()
    consoleSpy.mockRestore()
  })

  it("clears pending even when retry fails (prevents infinite loop)", async () => {
    const pending: storage.PendingApproval = {
      sessionId: "sess-expired",
      grantId: "grant-expired",
      secret: "secret-expired",
      userAddress: "0xdef",
      scopes: ["chatgpt.conversations"],
      createdAt: new Date().toISOString(),
    }

    storage.savePendingApproval(pending)
    ;(sessionRelay.approveSession as Mock).mockRejectedValue(
      new Error("Session expired")
    )

    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

    renderHook(() => usePendingApprovalRetry())

    await waitFor(() => {
      expect(sessionRelay.approveSession).toHaveBeenCalledOnce()
    })

    // Should still clear — don't retry forever on expired sessions
    expect(storage.getPendingApproval()).toBeNull()
    consoleSpy.mockRestore()
  })
})
