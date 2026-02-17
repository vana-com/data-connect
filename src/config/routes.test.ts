import { describe, expect, it } from "vitest"
import { ROUTES } from "./routes"

describe("ROUTES auth contract", () => {
  it("does not expose removed legacy auth route keys", () => {
    expect("login" in ROUTES).toBe(false)
    expect("browserLogin" in ROUTES).toBe(false)
  })

  it("does not expose removed legacy auth route paths", () => {
    const routePaths = Object.values(ROUTES)

    expect(routePaths).not.toContain("/login")
    expect(routePaths).not.toContain("/browser-login")
  })

  it("keeps canonical auth flow route surfaces", () => {
    expect(ROUTES.connect).toBe("/connect")
    expect(ROUTES.grant).toBe("/grant")
    expect(ROUTES.settings).toBe("/settings")
  })
})
