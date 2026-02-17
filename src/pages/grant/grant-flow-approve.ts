import { approveSession as defaultApproveSession, SessionRelayError } from "@/services/sessionRelay"
import { createGrant as defaultCreateGrant, PersonalServerError } from "@/services/personalServer"
import { fetchServerIdentity as defaultFetchServerIdentity } from "@/services/serverRegistration"
import { clearPendingApproval as defaultClearPendingApproval, savePendingApproval as defaultSavePendingApproval } from "@/lib/storage"
import type { GrantFlowState } from "./types"

interface ExecuteGrantApprovalInput {
  flowState: GrantFlowState
  walletAddress: string
  personalServerPort: number
  personalServerDevToken: string | null
}

interface ExecuteGrantApprovalDeps {
  createGrant: typeof defaultCreateGrant
  fetchServerIdentity: typeof defaultFetchServerIdentity
  savePendingApproval: typeof defaultSavePendingApproval
  clearPendingApproval: typeof defaultClearPendingApproval
  approveSession: typeof defaultApproveSession
}

const defaultDeps: ExecuteGrantApprovalDeps = {
  createGrant: defaultCreateGrant,
  fetchServerIdentity: defaultFetchServerIdentity,
  savePendingApproval: defaultSavePendingApproval,
  clearPendingApproval: defaultClearPendingApproval,
  approveSession: defaultApproveSession,
}

export async function executeGrantApproval(
  input: ExecuteGrantApprovalInput,
  deps: ExecuteGrantApprovalDeps = defaultDeps
): Promise<{ grantId: string; serverAddress: string }> {
  const { flowState, walletAddress, personalServerPort, personalServerDevToken } =
    input

  if (!flowState.session) {
    throw new Error("Cannot approve session: session is missing from the flow state.")
  }

  if (flowState.session.expiresAt) {
    const expiresAt = new Date(flowState.session.expiresAt).getTime()
    if (!Number.isNaN(expiresAt) && Date.now() > expiresAt) {
      throw new SessionRelayError(
        "This session has expired. Please start a new request from the app."
      )
    }
  }

  const expiresAtNum = flowState.session.expiresAt
    ? Math.floor(new Date(flowState.session.expiresAt).getTime() / 1000)
    : undefined

  const { grantId } = await deps.createGrant(
    personalServerPort,
    {
      granteeAddress: flowState.session.granteeAddress,
      scopes: flowState.session.scopes,
      expiresAt: expiresAtNum,
    },
    personalServerDevToken
  )

  const { address: serverAddress } = await deps.fetchServerIdentity(personalServerPort)

  if (!flowState.secret) {
    throw new SessionRelayError(
      "Cannot approve session: secret is missing from the flow state. " +
        "The builder will not be notified of this grant."
    )
  }

  deps.savePendingApproval({
    sessionId: flowState.sessionId,
    grantId,
    secret: flowState.secret,
    userAddress: walletAddress,
    serverAddress,
    scopes: flowState.session.scopes,
    createdAt: new Date().toISOString(),
  })

  await deps.approveSession(flowState.sessionId, {
    secret: flowState.secret,
    grantId,
    userAddress: walletAddress,
    serverAddress,
    scopes: flowState.session.scopes,
  })

  deps.clearPendingApproval()

  return { grantId, serverAddress }
}

export function toApprovalErrorMessage(error: unknown): string {
  if (error instanceof SessionRelayError || error instanceof PersonalServerError) {
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return "Failed to complete the grant flow"
}
