import type { Platform } from "@/types"
import { testPlatforms } from "./home-debug-fixtures"

type ConnectedSourcesUiDebugScenario = "empty" | "early" | "mature"

const CONNECTED_SOURCES_UI_DEBUG_SCENARIO_COUNTS: Record<
  ConnectedSourcesUiDebugScenario,
  number
> = {
  empty: 0,
  early: 2,
  mature: 4,
}

export const CONNECTED_SOURCES_UI_DEBUG_SCENARIO_VALUES: ConnectedSourcesUiDebugScenario[] =
  ["empty", "early", "mature"]

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

  const targetCount =
    CONNECTED_SOURCES_UI_DEBUG_SCENARIO_COUNTS[debug.scenario]
  if (targetCount === 0) return []

  const sourcePlatforms = platforms.length > 0 ? platforms : testPlatforms
  const primary = sourcePlatforms.slice(0, targetCount)
  if (primary.length === targetCount) return primary

  const dedupedById = new Map(primary.map(platform => [platform.id, platform]))
  for (const platform of testPlatforms) {
    if (!dedupedById.has(platform.id)) dedupedById.set(platform.id, platform)
    if (dedupedById.size >= targetCount) break
  }

  return Array.from(dedupedById.values()).slice(0, targetCount)
}
