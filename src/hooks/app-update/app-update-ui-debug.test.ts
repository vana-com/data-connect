import { describe, expect, it } from "vitest"
import {
  getAppUpdateUiDebugScenario,
  isAppUpdateUiDebugEnabled,
  resolveAppUpdateUiDebugDecision,
} from "./app-update-ui-debug"

describe("app update ui debug", () => {
  it("resolves update-available scenario", () => {
    const search = "?appUpdateScenario=update-available"

    expect(isAppUpdateUiDebugEnabled(search)).toBe(true)
    expect(getAppUpdateUiDebugScenario(search)).toBe("update-available")
    expect(resolveAppUpdateUiDebugDecision(search)).toEqual({
      status: "updateAvailable",
      localVersion: "1.2.3",
      remoteVersion: "1.2.4",
      releaseUrl: "https://github.com/vana-com/data-connect/releases/latest",
    })
  })

  it("returns null for invalid scenario", () => {
    const search = "?appUpdateScenario=bogus"

    expect(isAppUpdateUiDebugEnabled(search)).toBe(false)
    expect(getAppUpdateUiDebugScenario(search)).toBeNull()
    expect(resolveAppUpdateUiDebugDecision(search)).toBeNull()
  })
})
