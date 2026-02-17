import { describe, expect, it } from "vitest"
import {
  canTransitionGrantFlowStatus,
  createInitialGrantFlowState,
  reduceGrantFlowState,
} from "./grant-flow-machine"

describe("grant-flow-machine", () => {
  it("allows production status transitions", () => {
    expect(canTransitionGrantFlowStatus("loading", "claiming")).toBe(true)
    expect(canTransitionGrantFlowStatus("claiming", "verifying-builder")).toBe(true)
    expect(canTransitionGrantFlowStatus("verifying-builder", "consent")).toBe(true)
    expect(canTransitionGrantFlowStatus("consent", "auth-required")).toBe(true)
    expect(canTransitionGrantFlowStatus("auth-required", "preparing-server")).toBe(true)
    expect(canTransitionGrantFlowStatus("preparing-server", "creating-grant")).toBe(true)
    expect(canTransitionGrantFlowStatus("creating-grant", "preparing-server")).toBe(true)
    expect(canTransitionGrantFlowStatus("creating-grant", "approving")).toBe(true)
    expect(canTransitionGrantFlowStatus("approving", "success")).toBe(true)
  })

  it("rejects invalid status transitions", () => {
    expect(canTransitionGrantFlowStatus("loading", "approving")).toBe(false)
    expect(canTransitionGrantFlowStatus("claiming", "success")).toBe(false)
    expect(canTransitionGrantFlowStatus("success", "loading")).toBe(false)
  })

  it("keeps current state on invalid transition action", () => {
    const initial = createInitialGrantFlowState("session-1", "secret-1")

    const next = reduceGrantFlowState(initial, {
      type: "transition",
      status: "approving",
    })

    expect(next).toEqual(initial)
  })

  it("applies state mutations for session, manifest, grant id, and fail", () => {
    const started = reduceGrantFlowState(createInitialGrantFlowState(), {
      type: "start",
      sessionId: "session-1",
      secret: "secret-1",
    })

    const withSession = reduceGrantFlowState(started, {
      type: "set-session",
      session: {
        id: "session-1",
        granteeAddress: "0xbuilder",
        scopes: ["chatgpt.conversations"],
        expiresAt: "2030-01-01T00:00:00.000Z",
      },
    })

    const withManifest = reduceGrantFlowState(withSession, {
      type: "set-builder-manifest",
      builderManifest: {
        name: "Builder",
        appUrl: "https://builder.example.com",
      },
    })

    const withGrant = reduceGrantFlowState(withManifest, {
      type: "set-grant-id",
      grantId: "grant-1",
    })

    const failed = reduceGrantFlowState(withGrant, {
      type: "fail",
      sessionId: "session-1",
      secret: "secret-1",
      error: "boom",
    })

    expect(withGrant.session?.id).toBe("session-1")
    expect(withGrant.builderManifest?.name).toBe("Builder")
    expect(withGrant.grantId).toBe("grant-1")
    expect(failed).toEqual({
      sessionId: "session-1",
      secret: "secret-1",
      status: "error",
      error: "boom",
    })
  })
})
