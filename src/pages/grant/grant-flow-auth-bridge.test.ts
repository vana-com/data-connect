import { describe, expect, it } from "vitest"
import {
  resolveAuthResumeGate,
  resolveInitialApprovalGate,
} from "./grant-flow-auth-bridge"

describe("grant-flow-auth-bridge", () => {
  it("defers to auth when user is not authenticated", () => {
    const result = resolveInitialApprovalGate({
      isAuthenticated: false,
      walletAddress: null,
      personalServerPort: 8080,
      personalServerTunnelUrl: "https://test.server",
    })

    expect(result).toEqual({ type: "defer-auth", status: "auth-required" })
  })

  it("defers to server readiness when auth exists but tunnel is missing", () => {
    const result = resolveInitialApprovalGate({
      isAuthenticated: true,
      walletAddress: "0xuser",
      personalServerPort: 8080,
      personalServerTunnelUrl: null,
    })

    expect(result).toEqual({ type: "defer-server", status: "creating-grant" })
  })

  it("returns approve when pending auth can resume", () => {
    const result = resolveAuthResumeGate({
      authPending: true,
      isAuthenticated: true,
      walletAddress: "0xuser",
      personalServerStatus: "running",
      personalServerError: null,
      personalServerPort: 8080,
      personalServerTunnelUrl: "https://test.server",
      personalServerRestarting: false,
      tunnelTimedOut: false,
      isDemoSession: false,
      sessionId: "session-1",
      secret: "secret-1",
    })

    expect(result).toEqual({ type: "approve" })
  })

  it("fails when tunnel timeout is reached", () => {
    const result = resolveAuthResumeGate({
      authPending: true,
      isAuthenticated: true,
      walletAddress: "0xuser",
      personalServerStatus: "running",
      personalServerError: null,
      personalServerPort: 8080,
      personalServerTunnelUrl: null,
      personalServerRestarting: false,
      tunnelTimedOut: true,
      isDemoSession: false,
      sessionId: "session-1",
      secret: "secret-1",
    })

    expect(result.type).toBe("fail")
  })
})
