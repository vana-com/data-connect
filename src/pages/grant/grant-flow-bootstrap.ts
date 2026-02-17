import {
  claimSession as defaultClaimSession,
  SessionRelayError,
} from "../../services/sessionRelay"
import {
  verifyBuilder as defaultVerifyBuilder,
  BuilderVerificationError,
} from "../../services/builder"
import type {
  BuilderManifest,
  GrantFlowState,
  GrantSession,
  PrefetchedGrantData,
} from "./types"

interface ResolveGrantBootstrapInput {
  sessionId: string
  secret?: string
  prefetched?: PrefetchedGrantData
  isDemoSession: (sessionId: string) => boolean
  createDemoSession: (sessionId: string) => GrantSession
  createDemoBuilderManifest: () => BuilderManifest
  onStatusChange?: (status: GrantFlowState["status"]) => void
}

interface ResolveGrantBootstrapDeps {
  claimSession: typeof defaultClaimSession
  verifyBuilder: typeof defaultVerifyBuilder
}

const defaultDeps: ResolveGrantBootstrapDeps = {
  claimSession: defaultClaimSession,
  verifyBuilder: defaultVerifyBuilder,
}

export async function resolveGrantBootstrap(
  input: ResolveGrantBootstrapInput,
  deps: ResolveGrantBootstrapDeps = defaultDeps
): Promise<{ session: GrantSession; builderManifest: BuilderManifest }> {
  const {
    sessionId,
    secret,
    prefetched,
    isDemoSession,
    createDemoSession,
    createDemoBuilderManifest,
    onStatusChange,
  } = input

  if (isDemoSession(sessionId)) {
    return {
      session: createDemoSession(sessionId),
      builderManifest: createDemoBuilderManifest(),
    }
  }

  if (prefetched?.session && prefetched?.builderManifest) {
    return {
      session: prefetched.session,
      builderManifest: prefetched.builderManifest,
    }
  }

  if (prefetched?.session) {
    onStatusChange?.("verifying-builder")
    const builderManifest = await deps.verifyBuilder(
      prefetched.session.granteeAddress,
      prefetched.session.webhookUrl
    )
    return {
      session: prefetched.session,
      builderManifest,
    }
  }

  if (!secret) {
    throw new Error(
      "No secret provided. The deep link URL is missing the secret parameter."
    )
  }

  onStatusChange?.("claiming")
  const claimed = await deps.claimSession({ sessionId, secret })
  const session: GrantSession = {
    id: sessionId,
    granteeAddress: claimed.granteeAddress,
    scopes: claimed.scopes,
    expiresAt: claimed.expiresAt,
    webhookUrl: claimed.webhookUrl,
    appUserId: claimed.appUserId,
  }

  onStatusChange?.("verifying-builder")
  const builderManifest = await deps.verifyBuilder(
    claimed.granteeAddress,
    claimed.webhookUrl
  )

  return {
    session,
    builderManifest,
  }
}

export function toBootstrapErrorMessage(error: unknown): string {
  if (
    error instanceof SessionRelayError ||
    error instanceof BuilderVerificationError
  ) {
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return "Failed to load session"
}
