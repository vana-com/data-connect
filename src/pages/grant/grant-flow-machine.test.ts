import { describe, expect, it } from "vitest"
import {
  createInitialGrantFlowState,
  reduceGrantFlow,
} from "./grant-flow-machine"
import type { BuilderManifest, GrantSession } from "./types"

const session: GrantSession = {
  id: "session-1",
  granteeAddress: "0xbuilder",
  scopes: ["chatgpt.conversations"],
  expiresAt: "2030-01-01T00:00:00.000Z",
}

const builderManifest: BuilderManifest = {
  name: "Test Builder",
  appUrl: "https://test.example.com",
}

describe("grant-flow-machine", () => {
  it("moves from bootstrap start to consent on success", () => {
    const initial = createInitialGrantFlowState()
    const loading = reduceGrantFlow(initial, {
      type: "BOOTSTRAP_START",
      sessionId: "session-1",
      secret: "secret-1",
    })
    const consent = reduceGrantFlow(loading, {
      type: "BOOTSTRAP_SUCCESS",
      sessionId: "session-1",
      secret: "secret-1",
      session,
      builderManifest,
    })

    expect(consent.status).toBe("consent")
    expect(consent.session).toEqual(session)
    expect(consent.builderManifest).toEqual(builderManifest)
  })

  it("moves to error with bootstrap failures", () => {
    const initial = createInitialGrantFlowState()
    const failed = reduceGrantFlow(initial, {
      type: "BOOTSTRAP_ERROR",
      sessionId: "session-1",
      secret: "secret-1",
      error: "failed",
    })

    expect(failed.status).toBe("error")
    expect(failed.error).toBe("failed")
  })

  it("supports approval transition updates", () => {
    const initial = createInitialGrantFlowState()
    const loading = reduceGrantFlow(initial, {
      type: "BOOTSTRAP_START",
      sessionId: "session-1",
      secret: "secret-1",
    })
    const consent = reduceGrantFlow(loading, {
      type: "BOOTSTRAP_SUCCESS",
      sessionId: "session-1",
      secret: "secret-1",
      session,
      builderManifest,
    })
    const creating = reduceGrantFlow(consent, {
      type: "SET_STATUS",
      status: "creating-grant",
    })
    const withGrantId = reduceGrantFlow(creating, {
      type: "SET_GRANT_ID",
      grantId: "grant-1",
    })
    const success = reduceGrantFlow(withGrantId, { type: "FORCE_SUCCESS" })

    expect(creating.status).toBe("creating-grant")
    expect(withGrantId.grantId).toBe("grant-1")
    expect(success.status).toBe("success")
  })
})
