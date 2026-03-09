import { describe, expect, it } from "vitest"
import type { ConnectedApp } from "@/types"
import {
  getConnectedAppsUiDebugScenario,
  isConnectedAppsUiDebugEnabled,
  resolveConnectedAppsUiDebugApps,
} from "./connected-apps-ui-debug"

const REAL_CONNECTED_APPS: ConnectedApp[] = [
  {
    id: "real-connected-app",
    name: "Real Connected App",
    permissions: ["Read"],
    connectedAt: "2026-03-09T00:00:00.000Z",
  },
]

describe("connected apps ui debug", () => {
  it("resolves two-test-apps scenario", () => {
    const search = "?tab=connected&connectedAppsScenario=two-test-apps"
    const apps = resolveConnectedAppsUiDebugApps({
      apps: REAL_CONNECTED_APPS,
      search,
    })

    expect(isConnectedAppsUiDebugEnabled(search)).toBe(true)
    expect(getConnectedAppsUiDebugScenario(search)).toBe("two-test-apps")
    expect(apps).toHaveLength(2)
    expect(apps.map(app => app.name)).toEqual(["Even Stevens", "RickRoll"])
    expect(apps[0]?.externalUrl).toBe(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    )
  })

  it("resolves empty scenario", () => {
    const search = "?tab=connected&connectedAppsScenario=empty"

    expect(isConnectedAppsUiDebugEnabled(search)).toBe(true)
    expect(getConnectedAppsUiDebugScenario(search)).toBe("empty")
    expect(
      resolveConnectedAppsUiDebugApps({
        apps: REAL_CONNECTED_APPS,
        search,
      })
    ).toEqual([])
  })

  it("resolves loading scenario", () => {
    const search = "?tab=connected&connectedAppsScenario=loading"

    expect(isConnectedAppsUiDebugEnabled(search)).toBe(true)
    expect(getConnectedAppsUiDebugScenario(search)).toBe("loading")
    expect(
      resolveConnectedAppsUiDebugApps({
        apps: REAL_CONNECTED_APPS,
        search,
      })
    ).toEqual([])
  })

  it("falls back to real apps for invalid scenario", () => {
    const search = "?tab=connected&connectedAppsScenario=bogus"

    expect(isConnectedAppsUiDebugEnabled(search)).toBe(false)
    expect(getConnectedAppsUiDebugScenario(search)).toBeNull()
    expect(
      resolveConnectedAppsUiDebugApps({
        apps: REAL_CONNECTED_APPS,
        search,
      })
    ).toEqual(REAL_CONNECTED_APPS)
  })
})
