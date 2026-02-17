import type { Dispatch } from "redux"
import { addConnectedApp } from "../../state/store"
import { approveSession, SessionRelayError } from "../../services/sessionRelay"
import { createGrant, PersonalServerError } from "../../services/personalServer"
import { fetchServerIdentity } from "../../services/serverRegistration"
import {
  savePendingApproval,
  clearPendingApproval,
} from "../../lib/storage"
import {
  clearPendingApprovalSecret,
  setPendingApprovalSecret,
} from "../../services/pending-approval-secret-bridge"
import type { GrantFlowAction } from "./grant-flow-machine"
import type {
  BuilderManifest,
  GrantFlowState,
  GrantFlowStatus,
  GrantSession,
} from "./types"

interface PersonalServerApprovalContext {
  port: number
  devToken: string | null
}

interface RunGrantApprovalPipelineArgs {
  flowState: GrantFlowState
  walletAddress: string
  personalServer: PersonalServerApprovalContext
  dispatch: Dispatch
  dispatchFlow: (action: GrantFlowAction) => void
  transitionFlow: (status: GrantFlowStatus) => void
  isDemoSession: (sessionId: string) => boolean
}

function assertSessionNotExpired(session: GrantSession): void {
  if (!session.expiresAt) return
  const expiresAt = new Date(session.expiresAt).getTime()
  if (!Number.isNaN(expiresAt) && Date.now() > expiresAt) {
    throw new SessionRelayError(
      "This session has expired. Please start a new request from the app.",
    )
  }
}

function buildConnectedAppName(
  builderManifest: BuilderManifest | undefined,
  session: GrantSession,
): string {
  return (
    builderManifest?.name ??
    session.appName ??
    `App ${session.granteeAddress.slice(0, 6)}…${session.granteeAddress.slice(-4)}`
  )
}

export async function runGrantApprovalPipeline({
  flowState,
  walletAddress,
  personalServer,
  dispatch,
  dispatchFlow,
  transitionFlow,
  isDemoSession,
}: RunGrantApprovalPipelineArgs): Promise<void> {
  if (!flowState.session) {
    return
  }

  if (isDemoSession(flowState.sessionId)) {
    transitionFlow("success")
    return
  }

  assertSessionNotExpired(flowState.session)

  transitionFlow("creating-grant")

  const expiresAtNum = flowState.session.expiresAt
    ? Math.floor(new Date(flowState.session.expiresAt).getTime() / 1000)
    : undefined

  const { grantId } = await createGrant(
    personalServer.port,
    {
      granteeAddress: flowState.session.granteeAddress,
      scopes: flowState.session.scopes,
      expiresAt: expiresAtNum,
    },
    personalServer.devToken,
  )

  dispatchFlow({ type: "set-grant-id", grantId })

  const { address: serverAddress } = await fetchServerIdentity(personalServer.port)

  transitionFlow("approving")

  if (!flowState.secret) {
    throw new SessionRelayError(
      "Cannot approve session: secret is missing from the flow state. " +
      "The builder will not be notified of this grant.",
    )
  }

  savePendingApproval({
    sessionId: flowState.sessionId,
    grantId,
    userAddress: walletAddress,
    serverAddress,
    scopes: flowState.session.scopes,
    createdAt: new Date().toISOString(),
  })
  setPendingApprovalSecret(flowState.sessionId, flowState.secret)

  await approveSession(flowState.sessionId, {
    secret: flowState.secret,
    grantId,
    userAddress: walletAddress,
    serverAddress,
    scopes: flowState.session.scopes,
  })

  clearPendingApproval()
  clearPendingApprovalSecret(flowState.sessionId)

  dispatch(
    addConnectedApp({
      id: grantId,
      name: buildConnectedAppName(flowState.builderManifest, flowState.session),
      icon: flowState.builderManifest?.icons?.[0]?.src,
      permissions: flowState.session.scopes,
      connectedAt: new Date().toISOString(),
    }),
  )

  transitionFlow("success")
}

export function mapGrantApprovalError(error: unknown): string {
  if (error instanceof SessionRelayError || error instanceof PersonalServerError) {
    return error.message
  }
  return "Failed to complete the grant flow"
}
