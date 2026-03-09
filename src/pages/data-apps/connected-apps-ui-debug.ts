import type { ConnectedApp } from "@/types"

// Data Apps > Connected apps debug (development only):
// - Pick a state:
//   - `/apps?tab=connected&connectedAppsScenario=empty`
//   - `/apps?tab=connected&connectedAppsScenario=loading`
//   - `/apps?tab=connected&connectedAppsScenario=two-test-apps`
// - Scenarios:
//   - `empty`
//     - Shows the connected-app empty state.
//   - `loading`
//     - Shows the connected-app loading state.
//   - `two-test-apps`
//     - Shows two mocked connected apps with deterministic launch URLs.
// - Invalid/missing scenario:
//   - No override is applied; real connected apps are used.
// - Production build ignores this query param.
type ConnectedAppsUiDebugScenario = "empty" | "loading" | "two-test-apps"

const RICKROLL_YOUTUBE_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"

const TEST_CONNECTED_APPS: ConnectedApp[] = [
  {
    id: "test-app-even-stevens",
    name: "Even Stevens",
    permissions: ["Read", "Write"],
    connectedAt: new Date().toISOString(),
    externalUrl: RICKROLL_YOUTUBE_URL,
  },
  {
    id: "test-app-rickroll",
    name: "RickRoll",
    permissions: ["Read", "Receive Realtime Updates"],
    connectedAt: new Date().toISOString(),
    externalUrl: RICKROLL_YOUTUBE_URL,
  },
]

const CONNECTED_APPS_UI_DEBUG_SCENARIOS: Record<
  ConnectedAppsUiDebugScenario,
  ConnectedApp[]
> = {
  empty: [],
  loading: [],
  "two-test-apps": TEST_CONNECTED_APPS,
}

export const CONNECTED_APPS_UI_DEBUG_SCENARIO_VALUES: ConnectedAppsUiDebugScenario[] =
  ["empty", "loading", "two-test-apps"]

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

export function getConnectedAppsUiDebugScenario(
  search: string
): ConnectedAppsUiDebugScenario | null {
  return resolveConnectedAppsUiDebugConfig(search).scenario
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
