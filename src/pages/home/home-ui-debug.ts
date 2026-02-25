import type { Platform, Run } from "@/types"

// Home page UI debug (development only):
// - Pick a state: /?scenario=<name>
// - Scenarios:
//   - blocking-waiting
//     - /?scenario=blocking-waiting
//      - User is in credential handoff. We intentionally block other sources.
//     - Simulates pre-auth waiting state; other source cards should be blocked.
//   - background
//     - /?scenario=background
//     - Cred step is done, import runs in background, user can start others.
//     - Simulates background import; other source cards should be available.
//   - phase-label
//     - /?scenario=phase-label
//     - If connector emits phase label, we show that as the primary status.
//     - Simulates run with phase label; phase label should override status message text.
//   - empty
//     - /?scenario=empty
//     - Simulates "all connected" by emitting a successful run for each platform.
//     - Import sources section should render the empty state panel.
// - Invalid/missing scenario:
//   - /?scenario=anything-else
//   - No override is applied; real runs are used.
// - Production build ignores all debug query params.

type HomeUiDebugScenario =
  | "blocking-waiting"
  | "background"
  | "phase-label"
  | "empty"

const HOME_UI_DEBUG_SCENARIOS: Record<HomeUiDebugScenario, Partial<Run>> = {
  "blocking-waiting": {
    isConnected: false,
    status: "running",
    statusMessage: "Waiting for sign in...",
    phase: undefined,
  },
  background: {
    isConnected: true,
    status: "running",
    statusMessage: "Collecting data...",
    phase: undefined,
  },
  "phase-label": {
    isConnected: true,
    status: "running",
    statusMessage: "Collecting data...",
    phase: { step: 2, total: 4, label: "Extracting conversations..." },
  },
  empty: {
    isConnected: true,
    status: "success",
    statusMessage: "Completed",
    phase: undefined,
  },
}

export const HOME_UI_DEBUG_SCENARIO_VALUES: HomeUiDebugScenario[] = [
  "blocking-waiting",
  "background",
  "phase-label",
  "empty",
]

function isHomeUiDebugScenario(
  value: string | null
): value is HomeUiDebugScenario {
  return value !== null && value in HOME_UI_DEBUG_SCENARIOS
}

function resolveHomeUiDebugConfig(search: string): {
  enabled: boolean
  scenario: HomeUiDebugScenario | null
} {
  if (!import.meta.env.DEV) return { enabled: false, scenario: null }

  const params = new URLSearchParams(search)
  const scenarioValue = params.get("scenario")
  const scenario = isHomeUiDebugScenario(scenarioValue) ? scenarioValue : null
  return {
    enabled: scenario !== null,
    scenario,
  }
}

export function isHomeUiDebugEnabled(search: string): boolean {
  return resolveHomeUiDebugConfig(search).enabled
}

const minutesAgo = (minutes: number) =>
  new Date(Date.now() - minutes * 60_000).toISOString()

export function resolveHomeUiDebugRuns({
  runs,
  platforms,
  search,
}: {
  runs: Run[]
  platforms: Platform[]
  search: string
}): Run[] {
  const debug = resolveHomeUiDebugConfig(search)
  if (!debug.enabled || !debug.scenario) return runs

  const scenarioPatch = HOME_UI_DEBUG_SCENARIOS[debug.scenario]
  const targetPlatformId = platforms[0]?.id ?? "chatgpt"

  const debugStartDate = minutesAgo(3)

  if (debug.scenario === "empty") {
    return platforms.map(platform => ({
      id: `home-debug-${debug.scenario}-${platform.id}`,
      platformId: platform.id,
      filename: platform.filename || platform.id,
      isConnected: true,
      startDate: debugStartDate,
      endDate: debugStartDate,
      status: "success",
      statusMessage: "Completed",
      url: "",
      company: platform.company || "Debug",
      name: platform.name || "Debug",
      logs: "",
      exportPath: `/tmp/debug/${platform.id}/export.json`,
      phase: undefined,
    }))
  }

  const debugRun: Run = {
    id: `home-debug-${debug.scenario}`,
    platformId: targetPlatformId,
    filename: targetPlatformId,
    isConnected: true,
    startDate: debugStartDate,
    status: "running",
    url: "",
    company: "Debug",
    name: "Debug",
    logs: "",
    ...scenarioPatch,
  }

  return [debugRun]
}
