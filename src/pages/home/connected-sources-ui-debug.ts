import type { Platform, Run } from "@/types"
import { testPlatforms } from "./home-debug-fixtures"

// Home > Connected sources debug (development only):
// - Query param: /?connectedSourcesScenario=<scenario>
// - Available scenarios:
//   - empty
//     - /?connectedSourcesScenario=empty
//     - Returns no connected source cards.
//   - early
//     - /?connectedSourcesScenario=early
//     - Returns 2 connected source cards.
//   - mature
//     - /?connectedSourcesScenario=mature
//     - Returns 4 connected source cards.
//   - last-run-details
//     - /?connectedSourcesScenario=last-run-details
//     - Returns 4 connected source cards and injects fake successful runs with
//       staggered timestamps (today, 1d, 2d, 4d ago) so row meta shows "Last <weekday>"
//       instead of "Never run".
// - Missing/invalid scenario:
//   - No override is applied; real platforms/runs are used.
// - Production build ignores this query param.
type ConnectedSourcesUiDebugScenario =
  | "empty"
  | "early"
  | "mature"
  | "last-run-details"

const CONNECTED_SOURCES_UI_DEBUG_SCENARIO_COUNTS: Record<
  ConnectedSourcesUiDebugScenario,
  number
> = {
  empty: 0,
  early: 2,
  mature: 4,
  "last-run-details": 4,
}

export const CONNECTED_SOURCES_UI_DEBUG_SCENARIO_VALUES: ConnectedSourcesUiDebugScenario[] =
  ["empty", "early", "mature", "last-run-details"]

function isConnectedSourcesUiDebugScenario(
  value: string | null
): value is ConnectedSourcesUiDebugScenario {
  return value !== null && value in CONNECTED_SOURCES_UI_DEBUG_SCENARIO_COUNTS
}

function resolveConnectedSourcesUiDebugConfig(search: string): {
  enabled: boolean
  scenario: ConnectedSourcesUiDebugScenario | null
} {
  if (!import.meta.env.DEV) return { enabled: false, scenario: null }

  const params = new URLSearchParams(search)
  const scenarioValue = params.get("connectedSourcesScenario")
  const scenario = isConnectedSourcesUiDebugScenario(scenarioValue)
    ? scenarioValue
    : null
  return {
    enabled: scenario !== null,
    scenario,
  }
}

export function isConnectedSourcesUiDebugEnabled(search: string): boolean {
  return resolveConnectedSourcesUiDebugConfig(search).enabled
}

export function resolveConnectedSourcesUiDebugPlatforms({
  platforms,
  search,
}: {
  platforms: Platform[]
  search: string
}): Platform[] {
  const debug = resolveConnectedSourcesUiDebugConfig(search)
  if (!debug.enabled || !debug.scenario) return platforms

  const targetCount = CONNECTED_SOURCES_UI_DEBUG_SCENARIO_COUNTS[debug.scenario]
  if (targetCount === 0) return []

  // const sourcePlatforms = platforms.length > 0 ? platforms : testPlatforms
  // const primary = sourcePlatforms.slice(0, targetCount)
  // if (primary.length === targetCount) return primary

  // const dedupedById = new Map(primary.map(platform => [platform.id, platform]))
  // for (const platform of testPlatforms) {
  //   if (!dedupedById.has(platform.id)) dedupedById.set(platform.id, platform)
  //   if (dedupedById.size >= targetCount) break
  // }

  // Deterministic debug ordering:
  // always follow `testPlatforms` order so changing fixtures directly controls
  // connected-sources debug card order.
  const runtimeById = new Map(
    platforms.map(platform => [platform.id, platform])
  )
  const ordered = testPlatforms.map(
    platform => runtimeById.get(platform.id) ?? platform
  )

  return ordered.slice(0, targetCount)
}

const daysAgoIso = (days: number) =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

export function resolveConnectedSourcesUiDebugRuns({
  runs,
  platforms,
  search,
}: {
  runs: Run[]
  platforms: Platform[]
  search: string
}): Run[] {
  const debug = resolveConnectedSourcesUiDebugConfig(search)
  if (!debug.enabled || debug.scenario !== "last-run-details") return runs

  const targetPlatforms =
    platforms.length > 0 ? platforms : testPlatforms.slice(0, 4)
  const dayOffsets = [0, 1, 2, 4]

  return targetPlatforms.map((platform, index) => {
    const timestamp = daysAgoIso(dayOffsets[index] ?? index)
    return {
      id: `connected-sources-debug-run-${platform.id}`,
      platformId: platform.id,
      filename: platform.filename,
      isConnected: true,
      startDate: timestamp,
      endDate: timestamp,
      status: "success",
      url: "",
      company: platform.company,
      name: platform.name,
      logs: "",
      exportPath: `/tmp/debug/${platform.id}/export.json`,
    }
  })
}
