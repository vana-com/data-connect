import type {
  BuilderManifest,
  GrantFlowState,
  GrantFlowStatus,
  GrantSession,
} from "./types"

const ALLOWED_STATUS_TRANSITIONS: Record<GrantFlowStatus, Set<GrantFlowStatus>> = {
  loading: new Set(["claiming", "verifying-builder", "consent", "error", "success"]),
  claiming: new Set(["verifying-builder", "error"]),
  "verifying-builder": new Set(["consent", "error"]),
  consent: new Set(["auth-required", "preparing-server", "creating-grant", "success", "error"]),
  "auth-required": new Set(["preparing-server", "creating-grant", "success", "error"]),
  "preparing-server": new Set(["creating-grant", "error"]),
  "creating-grant": new Set(["preparing-server", "approving", "error"]),
  approving: new Set(["success", "error"]),
  success: new Set(),
  error: new Set(["loading"]),
}

export type GrantFlowAction =
  | { type: "start"; sessionId: string; secret?: string }
  | { type: "transition"; status: GrantFlowStatus }
  | { type: "set-session"; session: GrantSession }
  | { type: "set-builder-manifest"; builderManifest: BuilderManifest }
  | { type: "set-grant-id"; grantId: string }
  | { type: "fail"; sessionId: string; secret?: string; error: string }

export function createInitialGrantFlowState(
  sessionId = "",
  secret?: string,
): GrantFlowState {
  return {
    sessionId,
    secret,
    status: "loading",
  }
}

export function canTransitionGrantFlowStatus(
  from: GrantFlowStatus,
  to: GrantFlowStatus,
): boolean {
  if (from === to) {
    return true
  }

  return ALLOWED_STATUS_TRANSITIONS[from].has(to)
}

export function reduceGrantFlowState(
  state: GrantFlowState,
  action: GrantFlowAction,
): GrantFlowState {
  switch (action.type) {
    case "start":
      return {
        sessionId: action.sessionId,
        secret: action.secret,
        status: "loading",
      }
    case "transition":
      if (state.status === action.status) {
        return state
      }
      if (!canTransitionGrantFlowStatus(state.status, action.status)) {
        return state
      }
      return {
        ...state,
        status: action.status,
      }
    case "set-session":
      return {
        ...state,
        session: action.session,
      }
    case "set-builder-manifest":
      return {
        ...state,
        builderManifest: action.builderManifest,
      }
    case "set-grant-id":
      return {
        ...state,
        grantId: action.grantId,
      }
    case "fail":
      return {
        sessionId: action.sessionId,
        secret: action.secret,
        status: "error",
        error: action.error,
      }
  }
}
