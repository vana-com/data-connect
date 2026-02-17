import type { GrantFlowAction } from "./grant-flow-machine"
import type { GrantFlowStatus } from "./types"

interface ResolveInitialApprovalGateArgs {
  isAuthenticated: boolean
  walletAddress: string | null
  personalServerPort: number | null
  personalServerTunnelUrl: string | null
}

export type InitialApprovalGate =
  | { type: "defer-auth"; status: GrantFlowStatus }
  | { type: "defer-server"; status: GrantFlowStatus }
  | { type: "ready"; walletAddress: string; personalServerPort: number }

export function resolveInitialApprovalGate({
  isAuthenticated,
  walletAddress,
  personalServerPort,
  personalServerTunnelUrl,
}: ResolveInitialApprovalGateArgs): InitialApprovalGate {
  if (!isAuthenticated || !walletAddress) {
    return { type: "defer-auth", status: "auth-required" }
  }

  if (!personalServerPort || !personalServerTunnelUrl) {
    return { type: "defer-server", status: "creating-grant" }
  }

  return {
    type: "ready",
    walletAddress,
    personalServerPort,
  }
}

interface ResolveAuthResumeGateArgs {
  authPending: boolean
  isAuthenticated: boolean
  walletAddress: string | null
  personalServerStatus: string
  personalServerError: string | null
  personalServerPort: number | null
  personalServerTunnelUrl: string | null
  personalServerRestarting: boolean
  tunnelTimedOut: boolean
  isDemoSession: boolean
  sessionId: string
  secret?: string
}

export type AuthResumeGateResult =
  | { type: "noop" }
  | { type: "fail"; action: GrantFlowAction }
  | { type: "wait"; status: GrantFlowStatus }
  | { type: "approve" }

export function resolveAuthResumeGate({
  authPending,
  isAuthenticated,
  walletAddress,
  personalServerStatus,
  personalServerError,
  personalServerPort,
  personalServerTunnelUrl,
  personalServerRestarting,
  tunnelTimedOut,
  isDemoSession,
  sessionId,
  secret,
}: ResolveAuthResumeGateArgs): AuthResumeGateResult {
  if (!authPending || !isAuthenticated || !walletAddress) {
    return { type: "noop" }
  }

  if (personalServerStatus === "error") {
    return {
      type: "fail",
      action: {
        type: "fail",
        sessionId,
        secret,
        error: personalServerError || "Personal Server failed to start.",
      },
    }
  }

  if (!isDemoSession && personalServerRestarting) {
    return { type: "wait", status: "preparing-server" }
  }

  if (tunnelTimedOut) {
    return {
      type: "fail",
      action: {
        type: "fail",
        sessionId,
        secret,
        error:
          "Could not establish a public tunnel for the Personal Server. The requesting app won't be able to access your data.",
      },
    }
  }

  if (!isDemoSession && (!personalServerPort || !personalServerTunnelUrl)) {
    return { type: "wait", status: "preparing-server" }
  }

  return { type: "approve" }
}
