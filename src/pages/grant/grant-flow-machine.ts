import type { BuilderManifest, GrantFlowState, GrantSession } from "./types"

export type GrantFlowAction =
  | { type: "BOOTSTRAP_START"; sessionId: string; secret?: string }
  | {
      type: "BOOTSTRAP_SUCCESS"
      sessionId: string
      secret?: string
      session: GrantSession
      builderManifest: BuilderManifest
    }
  | { type: "BOOTSTRAP_ERROR"; sessionId: string; secret?: string; error: string }
  | { type: "SET_STATUS"; status: GrantFlowState["status"] }
  | { type: "SET_GRANT_ID"; grantId: string }
  | { type: "APPROVAL_ERROR"; error: string }
  | { type: "FORCE_SUCCESS" }

export function createInitialGrantFlowState(): GrantFlowState {
  return {
    sessionId: "",
    status: "loading",
  }
}

export function reduceGrantFlow(
  state: GrantFlowState,
  action: GrantFlowAction
): GrantFlowState {
  switch (action.type) {
    case "BOOTSTRAP_START":
      return {
        sessionId: action.sessionId,
        secret: action.secret,
        status: "loading",
      }
    case "BOOTSTRAP_SUCCESS":
      return {
        ...state,
        sessionId: action.sessionId,
        secret: action.secret,
        status: "consent",
        session: action.session,
        builderManifest: action.builderManifest,
        error: undefined,
      }
    case "BOOTSTRAP_ERROR":
      return {
        sessionId: action.sessionId,
        secret: action.secret,
        status: "error",
        error: action.error,
      }
    case "SET_STATUS":
      if (state.status === action.status) {
        return state
      }
      return { ...state, status: action.status }
    case "SET_GRANT_ID":
      return { ...state, grantId: action.grantId }
    case "APPROVAL_ERROR":
      return { ...state, status: "error", error: action.error }
    case "FORCE_SUCCESS":
      return { ...state, status: "success" }
    default: {
      const exhaustive: never = action
      return exhaustive
    }
  }
}
