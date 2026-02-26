import type { AppUpdateDecision } from "./check-app-update"

/**
 * Manual smoke matrix (deterministic, DEV-only)
 *
 * 1) Toast appears:
 *    - Set `appUpdateScenario=update-available`
 *    - Expect bottom-right update toast.
 *
 * 2) Later suppresses same version across restart:
 *    - Click `Later` on the 1.2.4 toast.
 *    - Restart app, set `appUpdateScenario=update-available` again.
 *    - Expect no toast.
 *    - DevTools proof: localStorage key
 *      `dataconnect_app_update_dismissed_version` should equal `"1.2.4"`.
 *
 * 3) Newer version reappears:
 *    - Set `appUpdateScenario=update-available-next`.
 *    - Expect toast for version 1.2.5.
 *
 * 4) Update now opens release URL:
 *    - Click `Update now`.
 *    - Expect `openExternalUrl` path to the release URL.
 */
type AppUpdateUiDebugScenario =
  | "update-available"
  | "update-available-next"
  | "up-to-date"
  | "unknown"

const DEFAULT_RELEASE_URL =
  "https://github.com/vana-com/data-connect/releases/latest"

const APP_UPDATE_UI_DEBUG_SCENARIOS: Record<
  AppUpdateUiDebugScenario,
  AppUpdateDecision
> = {
  "update-available": {
    status: "updateAvailable",
    localVersion: "1.2.3",
    remoteVersion: "1.2.4",
    releaseUrl: DEFAULT_RELEASE_URL,
  },
  "update-available-next": {
    status: "updateAvailable",
    localVersion: "1.2.3",
    remoteVersion: "1.2.5",
    releaseUrl: DEFAULT_RELEASE_URL,
  },
  "up-to-date": {
    status: "upToDate",
    localVersion: "1.2.4",
    remoteVersion: "1.2.4",
    releaseUrl: DEFAULT_RELEASE_URL,
  },
  unknown: {
    status: "unknown",
    localVersion: "1.2.3",
    remoteVersion: null,
    releaseUrl: DEFAULT_RELEASE_URL,
  },
}

export const APP_UPDATE_UI_DEBUG_SCENARIO_VALUES: AppUpdateUiDebugScenario[] = [
  "update-available",
  "update-available-next",
  "up-to-date",
  "unknown",
]

function isAppUpdateUiDebugScenario(
  value: string | null
): value is AppUpdateUiDebugScenario {
  return value !== null && value in APP_UPDATE_UI_DEBUG_SCENARIOS
}

function getScenarioFromSearch(
  search: string
): AppUpdateUiDebugScenario | null {
  if (!import.meta.env.DEV) return null
  const params = new URLSearchParams(search)
  const scenario = params.get("appUpdateScenario")
  return isAppUpdateUiDebugScenario(scenario) ? scenario : null
}

export function isAppUpdateUiDebugEnabled(search: string): boolean {
  return getScenarioFromSearch(search) !== null
}

export function getAppUpdateUiDebugScenario(
  search: string
): AppUpdateUiDebugScenario | null {
  return getScenarioFromSearch(search)
}

export function resolveAppUpdateUiDebugDecision(
  search: string
): AppUpdateDecision | null {
  const scenario = getScenarioFromSearch(search)
  return scenario ? APP_UPDATE_UI_DEBUG_SCENARIOS[scenario] : null
}
