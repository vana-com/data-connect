import type { ConnectedApp } from "@/types"

// Home > Connected apps debug (development only):
// - Query param: /?connectedAppsScenario=<scenario>
// - Available scenarios:
//   - empty
//     - Returns no connected apps.
//   - two-test-apps
//     - Returns two mocked connected apps.
// - Missing/invalid scenario:
//   - No override is applied; real connected apps are used.
// - Production build ignores this query param.
type ConnectedAppsUiDebugScenario = "empty" | "two-test-apps"

const RICKROLL_YOUTUBE_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"

const TEST_CONNECTED_APPS: ConnectedApp[] = [
  {
    id: "test-app-even-stevens",
    name: "Even Stevens",
    permissions: ["Read", "Write"],
    connectedAt: new Date().toISOString(),
  },
  {
    id: "test-app-rickroll",
    name: "RickRoll",
    permissions: ["Read", "Receive Realtime Updates"],
    connectedAt: new Date().toISOString(),
  },
]

const CONNECTED_APPS_UI_DEBUG_SCENARIOS: Record<
  ConnectedAppsUiDebugScenario,
  ConnectedApp[]
> = {
  empty: [],
  "two-test-apps": TEST_CONNECTED_APPS,
}

export const CONNECTED_APPS_UI_DEBUG_SCENARIO_VALUES: ConnectedAppsUiDebugScenario[] =
  ["empty", "two-test-apps"]

function isConnectedAppsUiDebugScenario(
  value: string | null
): value is ConnectedAppsUiDebugScenario {
  return value !== null && value in CONNECTED_APPS_UI_DEBUG_SCENARIOS
}

function resolveConnectedAppsUiDebugConfig(search: string): {
  enabled: boolean
  scenario: ConnectedAppsUiDebugScenario | null
} {
  if (!import.meta.env.DEV) return { enabled: false, scenario: null }

  const params = new URLSearchParams(search)
  const scenarioValue = params.get("connectedAppsScenario")
  const scenario = isConnectedAppsUiDebugScenario(scenarioValue)
    ? scenarioValue
    : null

  return {
    enabled: scenario !== null,
    scenario,
  }
}

export function isConnectedAppsUiDebugEnabled(search: string): boolean {
  return resolveConnectedAppsUiDebugConfig(search).enabled
}

export function resolveConnectedAppsUiDebugApps({
  apps,
  search,
}: {
  apps: ConnectedApp[]
  search: string
}): ConnectedApp[] {
  const debug = resolveConnectedAppsUiDebugConfig(search)
  if (!debug.enabled || !debug.scenario) return apps
  return CONNECTED_APPS_UI_DEBUG_SCENARIOS[debug.scenario]
}

export function resolveConnectedAppsUiDebugExternalUrl({
  appId,
  search,
}: {
  appId: string
  search: string
}): string | null {
  const debug = resolveConnectedAppsUiDebugConfig(search)
  if (!debug.enabled || debug.scenario !== "two-test-apps") return null

  const isDebugTestApp = TEST_CONNECTED_APPS.some(app => app.id === appId)
  if (!isDebugTestApp) return null

  return RICKROLL_YOUTUBE_URL
}
