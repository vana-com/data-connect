import {
  claimSession,
  SessionRelayError,
} from "../../services/sessionRelay"
import {
  verifyBuilder,
  BuilderVerificationError,
} from "../../services/builder"
import type {
  BuilderManifest,
  GrantFlowStatus,
  GrantSession,
  PrefetchedGrantData,
} from "./types"
import type { GrantFlowAction } from "./grant-flow-machine"

interface RunGrantFlowBootstrapArgs {
  sessionId: string
  secret?: string
  prefetched?: PrefetchedGrantData
  isCancelled: () => boolean
  dispatchFlow: (action: GrantFlowAction) => void
  transitionFlow: (status: GrantFlowStatus) => void
  isDemoSession: (sessionId: string) => boolean
  createDemoSession: (sessionId: string) => GrantSession
  createDemoBuilderManifest: () => BuilderManifest
}

export async function runGrantFlowBootstrap({
  sessionId,
  secret,
  prefetched,
  isCancelled,
  dispatchFlow,
  transitionFlow,
  isDemoSession,
  createDemoSession,
  createDemoBuilderManifest,
}: RunGrantFlowBootstrapArgs): Promise<void> {
  dispatchFlow({ type: "start", sessionId, secret })

  if (isDemoSession(sessionId)) {
    const session = createDemoSession(sessionId)
    const builderManifest = createDemoBuilderManifest()
    dispatchFlow({ type: "set-session", session })
    dispatchFlow({ type: "set-builder-manifest", builderManifest })
    transitionFlow("consent")
    return
  }

  if (prefetched?.session && prefetched?.builderManifest) {
    dispatchFlow({ type: "set-session", session: prefetched.session })
    dispatchFlow({
      type: "set-builder-manifest",
      builderManifest: prefetched.builderManifest,
    })
    transitionFlow("consent")
    return
  }

  if (prefetched?.session) {
    dispatchFlow({ type: "set-session", session: prefetched.session })

    try {
      transitionFlow("verifying-builder")
      const builderManifest = await verifyBuilder(
        prefetched.session.granteeAddress,
        prefetched.session.webhookUrl,
      )
      if (isCancelled()) return
      dispatchFlow({ type: "set-builder-manifest", builderManifest })
      transitionFlow("consent")
    } catch (error) {
      if (isCancelled()) return
      dispatchFlow({
        type: "fail",
        sessionId,
        secret,
        error:
          error instanceof BuilderVerificationError
            ? error.message
            : "Failed to verify builder",
      })
    }

    return
  }

  if (!secret) {
    dispatchFlow({
      type: "fail",
      sessionId,
      error: "No secret provided. The deep link URL is missing the secret parameter.",
    })
    return
  }

  try {
    transitionFlow("claiming")
    const claimed = await claimSession({ sessionId, secret })
    if (isCancelled()) return

    const session: GrantSession = {
      id: sessionId,
      granteeAddress: claimed.granteeAddress,
      scopes: claimed.scopes,
      expiresAt: claimed.expiresAt,
      webhookUrl: claimed.webhookUrl,
      appUserId: claimed.appUserId,
    }
    dispatchFlow({ type: "set-session", session })

    transitionFlow("verifying-builder")
    const builderManifest = await verifyBuilder(
      claimed.granteeAddress,
      claimed.webhookUrl,
    )
    if (isCancelled()) return
    dispatchFlow({ type: "set-builder-manifest", builderManifest })
    transitionFlow("consent")
  } catch (error) {
    if (isCancelled()) return
    dispatchFlow({
      type: "fail",
      sessionId,
      secret,
      error:
        error instanceof SessionRelayError ||
        error instanceof BuilderVerificationError
          ? error.message
          : "Failed to load session",
    })
  }
}
