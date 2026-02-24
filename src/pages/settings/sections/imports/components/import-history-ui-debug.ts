import type { TestImportsUiState } from "./import-history-panel-state"

// Import History UI debug (development only):
// - Pick a state: /settings?section=imports&importsScenario=<name>
// - Scenarios:
//   - empty | active | finished | mixed
//     - Uses existing panel-state fixtures.
//   - remove-pending
//     - Mixed fixture + keeps the active running row in Removing... state.
//   - stop-pending
//     - Mixed fixture + keeps active row in Stopping... state.
// - Invalid/missing scenario:
//   - No override is applied; real state is used.
// - Production build ignores all debug query params.

type ImportHistoryUiDebugScenario =
  | "empty"
  | "active"
  | "finished"
  | "mixed"
  | "remove-pending"
  | "stop-pending"

interface ImportHistoryUiDebugConfig {
  uiState: TestImportsUiState
  removingRunIds: string[]
  stoppingRunIds: string[]
}

const IMPORT_HISTORY_UI_DEBUG_SCENARIOS: Record<
  ImportHistoryUiDebugScenario,
  ImportHistoryUiDebugConfig
> = {
  empty: {
    uiState: "empty",
    removingRunIds: [],
    stoppingRunIds: [],
  },
  active: {
    uiState: "active",
    removingRunIds: [],
    stoppingRunIds: [],
  },
  finished: {
    uiState: "finished",
    removingRunIds: [],
    stoppingRunIds: [],
  },
  mixed: {
    uiState: "mixed",
    removingRunIds: [],
    stoppingRunIds: [],
  },
  "remove-pending": {
    uiState: "mixed",
    removingRunIds: ["test-active-chatgpt"],
    stoppingRunIds: [],
  },
  "stop-pending": {
    uiState: "mixed",
    removingRunIds: [],
    stoppingRunIds: ["test-active-chatgpt"],
  },
}

export const IMPORT_HISTORY_UI_DEBUG_SCENARIO_VALUES: ImportHistoryUiDebugScenario[] =
  ["empty", "active", "finished", "mixed", "remove-pending", "stop-pending"]

function isImportHistoryUiDebugScenario(
  value: string | null
): value is ImportHistoryUiDebugScenario {
  return value !== null && value in IMPORT_HISTORY_UI_DEBUG_SCENARIOS
}

function resolveImportHistoryUiDebugConfig(search: string): {
  enabled: boolean
  scenario: ImportHistoryUiDebugScenario | null
} {
  if (!import.meta.env.DEV) return { enabled: false, scenario: null }

  const params = new URLSearchParams(search)
  const scenarioValue = params.get("importsScenario")
  const scenario = isImportHistoryUiDebugScenario(scenarioValue)
    ? scenarioValue
    : null
  return {
    enabled: scenario !== null,
    scenario,
  }
}

export function isImportHistoryUiDebugEnabled(search: string): boolean {
  return resolveImportHistoryUiDebugConfig(search).enabled
}

export function resolveImportHistoryUiDebug(search: string): {
  uiState: TestImportsUiState | null
  removingRunIds: Set<string>
  stoppingRunIds: Set<string>
} {
  const debug = resolveImportHistoryUiDebugConfig(search)
  if (!debug.enabled || !debug.scenario) {
    return {
      uiState: null,
      removingRunIds: new Set<string>(),
      stoppingRunIds: new Set<string>(),
    }
  }

  const config = IMPORT_HISTORY_UI_DEBUG_SCENARIOS[debug.scenario]
  return {
    uiState: config.uiState,
    removingRunIds: new Set(config.removingRunIds),
    stoppingRunIds: new Set(config.stoppingRunIds),
  }
}
