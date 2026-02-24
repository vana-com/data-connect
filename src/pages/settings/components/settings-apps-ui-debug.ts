import type { ConnectedApp } from "@/types"

// Settings Apps UI debug (development only):
// - Pick a state: /settings?section=apps&settingsAppsScenario=<name>
// - Scenarios:
//   - empty
//     - Shows no connected apps state.
//   - two-test-apps
//     - Shows two mocked connected apps.
// - Invalid/missing scenario:
//   - No override is applied; real connected apps are used.
// - Production build ignores all debug query params.
type SettingsAppsUiDebugScenario = "empty" | "two-test-apps"

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

const SETTINGS_APPS_UI_DEBUG_SCENARIOS: Record<
  SettingsAppsUiDebugScenario,
  ConnectedApp[]
> = {
  empty: [],
  "two-test-apps": TEST_CONNECTED_APPS,
}

export const SETTINGS_APPS_UI_DEBUG_SCENARIO_VALUES: SettingsAppsUiDebugScenario[] =
  ["empty", "two-test-apps"]

function isSettingsAppsUiDebugScenario(
  value: string | null
): value is SettingsAppsUiDebugScenario {
  return value !== null && value in SETTINGS_APPS_UI_DEBUG_SCENARIOS
}

function resolveSettingsAppsUiDebugConfig(search: string): {
  enabled: boolean
  scenario: SettingsAppsUiDebugScenario | null
} {
  if (!import.meta.env.DEV) return { enabled: false, scenario: null }

  const params = new URLSearchParams(search)
  const scenarioValue = params.get("settingsAppsScenario")
  const scenario = isSettingsAppsUiDebugScenario(scenarioValue)
    ? scenarioValue
    : null

  return {
    enabled: scenario !== null,
    scenario,
  }
}

export function isSettingsAppsUiDebugEnabled(search: string): boolean {
  return resolveSettingsAppsUiDebugConfig(search).enabled
}

export function resolveSettingsAppsUiDebugApps({
  connectedApps,
  search,
}: {
  connectedApps: ConnectedApp[]
  search: string
}): ConnectedApp[] {
  const debug = resolveSettingsAppsUiDebugConfig(search)
  if (!debug.enabled || !debug.scenario) return connectedApps
  return SETTINGS_APPS_UI_DEBUG_SCENARIOS[debug.scenario]
}
