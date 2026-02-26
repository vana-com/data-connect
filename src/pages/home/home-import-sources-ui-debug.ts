import type { Platform, Run } from "@/types"
import {
  getConnectSourceEntries,
  resolvePlatformForEntry,
} from "@/lib/platform/utils"
import { testPlatforms } from "./home-debug-fixtures"

/**
 * Home > Import sources debug (development only)
 *
 * This module is intentionally isolated from the other Home debuggers.
 * It owns one explicit debug view-model for `AvailableSourcesList`:
 * - platforms
 * - runs
 * - connectedPlatformIds
 * - targetPlatformId (for diagnostics)
 * - runningPlatformIds (for diagnostics)
 *
 * Query params:
 * - `homeImportSourcesScenario=<scenario>`
 *
 * Scenarios:
 * - `blocking-waiting`:
 *   Simulates foreground/blocking auth handoff (`Waiting for sign in...`).
 *   Other source starts should be blocked.
 * - `background`:
 *   Simulates non-blocking background import (`Collecting data...`).
 * - `phase-label`:
 *   Same as background, but sets `run.phase.label` so the status line prefers
 *   phase text.
 * - `eta-weak`:
 *   Simulates weak-signal expectation mode (no useful size/history signal).
 * - `eta-size`:
 *   Simulates size-informed expectation mode by injecting a large `itemCount`.
 * - `eta-history`:
 *   Simulates history-informed expectation mode by injecting completed same-platform
 *   runs (`itemsExported` + duration) plus a running run.
 * - `empty`:
 *   Forces import grid empty-state by marking all import-card platforms as connected.
 *
 * IMPORTANT:
 * - `background` and `eta-weak` are functionally almost the same right now.
 *   They are kept separate to preserve intent while copy/estimator behavior evolves.
 */
type HomeImportSourcesScenario =
  | "blocking-waiting"
  | "background"
  | "phase-label"
  | "eta-weak"
  | "eta-size"
  | "eta-history"
  | "empty"

export const HOME_IMPORT_SOURCES_SCENARIO_VALUES: HomeImportSourcesScenario[] =
  [
    "blocking-waiting",
    "background",
    "phase-label",
    "eta-weak",
    "eta-size",
    "eta-history",
    "empty",
  ]

const HOME_IMPORT_SOURCES_PARAM = "homeImportSourcesScenario"

interface HomeImportSourcesDebugState {
  enabled: boolean
  scenario: HomeImportSourcesScenario | null
  platforms: Platform[]
  runs: Run[]
  connectedPlatformIds: string[]
  targetPlatformId: string | null
  runningPlatformIds: string[]
}

const minutesAgoIso = (minutes: number) =>
  new Date(Date.now() - minutes * 60_000).toISOString()

const isScenario = (value: string | null): value is HomeImportSourcesScenario =>
  value !== null && HOME_IMPORT_SOURCES_SCENARIO_VALUES.includes(value as never)

function getScenarioFromSearch(
  search: string
): HomeImportSourcesScenario | null {
  if (!import.meta.env.DEV) return null

  const params = new URLSearchParams(search)
  const explicit = params.get(HOME_IMPORT_SOURCES_PARAM)
  if (isScenario(explicit)) return explicit

  return null
}

export function isHomeImportSourcesDebugEnabled(search: string): boolean {
  return getScenarioFromSearch(search) !== null
}

export function getHomeImportSourcesScenario(
  search: string
): HomeImportSourcesScenario | null {
  return getScenarioFromSearch(search)
}

function platformById(platforms: Platform[]): Map<string, Platform> {
  return new Map(platforms.map(platform => [platform.id, platform]))
}

function buildSyntheticPlatform(entryId: string): Platform {
  return {
    id: entryId,
    company: entryId,
    name: entryId,
    filename: entryId,
    description: `${entryId} debug source`,
    isUpdated: false,
    logoURL: "",
    needsConnection: true,
    connectURL: null,
    connectSelector: null,
    exportFrequency: null,
    vectorize_config: null,
    runtime: null,
  }
}

function ensureConnectEntryPlatforms(realPlatforms: Platform[]): Platform[] {
  const byId = platformById(realPlatforms)
  const fixtureById = platformById(testPlatforms)
  const resolved: Platform[] = []

  for (const entry of getConnectSourceEntries()) {
    const fromReal = resolvePlatformForEntry(realPlatforms, entry)
    if (fromReal) {
      resolved.push(fromReal)
      continue
    }

    const fallbackId = entry.platformIds?.[0] ?? entry.id
    const fromFixture = byId.get(fallbackId) ?? fixtureById.get(fallbackId)
    resolved.push(fromFixture ?? buildSyntheticPlatform(fallbackId))
  }

  const deduped = new Map(resolved.map(platform => [platform.id, platform]))
  return Array.from(deduped.values())
}

function pickTargetPlatformId({
  platforms,
  connectedPlatformIds,
}: {
  platforms: Platform[]
  connectedPlatformIds: string[]
}): string | null {
  const connectedSet = new Set(connectedPlatformIds)
  for (const entry of getConnectSourceEntries()) {
    const platform = resolvePlatformForEntry(platforms, entry)
    if (!platform) continue
    if (connectedSet.has(platform.id)) continue
    return platform.id
  }
  return null
}

function makeRun({
  id,
  platformId,
  statusMessage,
  isConnected,
  itemCount,
  phaseLabel,
  startMinutesAgo = 3,
}: {
  id: string
  platformId: string
  statusMessage: string
  isConnected: boolean
  itemCount?: number
  phaseLabel?: string
  startMinutesAgo?: number
}): Run {
  return {
    id,
    platformId,
    filename: platformId,
    isConnected,
    startDate: minutesAgoIso(startMinutesAgo),
    status: "running",
    statusMessage,
    url: "",
    company: "Debug",
    name: "Debug",
    logs: "",
    itemCount,
    phase: phaseLabel ? { step: 2, total: 4, label: phaseLabel } : undefined,
  }
}

export function resolveHomeImportSourcesUiDebugState({
  search,
  realPlatforms,
  realRuns,
  realConnectedPlatformIds,
}: {
  search: string
  realPlatforms: Platform[]
  realRuns: Run[]
  realConnectedPlatformIds: string[]
}): HomeImportSourcesDebugState {
  const scenario = getScenarioFromSearch(search)
  if (!scenario) {
    return {
      enabled: false,
      scenario: null,
      platforms: realPlatforms,
      runs: realRuns,
      connectedPlatformIds: realConnectedPlatformIds,
      targetPlatformId: null,
      runningPlatformIds: realRuns
        .filter(run => run.status === "running")
        .map(run => run.platformId),
    }
  }

  const debugPlatforms = ensureConnectEntryPlatforms(realPlatforms)
  const targetPlatformId = pickTargetPlatformId({
    platforms: debugPlatforms,
    connectedPlatformIds: realConnectedPlatformIds,
  })

  if (scenario === "empty") {
    return {
      enabled: true,
      scenario,
      platforms: debugPlatforms,
      runs: [],
      connectedPlatformIds: debugPlatforms.map(platform => platform.id),
      targetPlatformId,
      runningPlatformIds: [],
    }
  }

  const safeTargetPlatformId =
    targetPlatformId ?? debugPlatforms[0]?.id ?? "chatgpt"
  const connectedPlatformIds = realConnectedPlatformIds.filter(
    platformId => platformId !== safeTargetPlatformId
  )

  if (scenario === "eta-history") {
    const runningRun = makeRun({
      id: "home-debug-eta-history-running",
      platformId: safeTargetPlatformId,
      statusMessage: "Collecting data...",
      isConnected: true,
      itemCount: 1800,
      startMinutesAgo: 7,
    })
    const historyRuns: Run[] = [
      {
        id: "home-debug-eta-history-1",
        platformId: safeTargetPlatformId,
        filename: safeTargetPlatformId,
        isConnected: true,
        startDate: minutesAgoIso(80),
        endDate: minutesAgoIso(60),
        status: "success",
        statusMessage: "Completed",
        url: "",
        company: "Debug",
        name: "Debug",
        logs: "",
        itemsExported: 1500,
        exportPath: `/tmp/debug/${safeTargetPlatformId}/history-1.json`,
      },
      {
        id: "home-debug-eta-history-2",
        platformId: safeTargetPlatformId,
        filename: safeTargetPlatformId,
        isConnected: true,
        startDate: minutesAgoIso(55),
        endDate: minutesAgoIso(30),
        status: "success",
        statusMessage: "Completed",
        url: "",
        company: "Debug",
        name: "Debug",
        logs: "",
        itemsExported: 2000,
        exportPath: `/tmp/debug/${safeTargetPlatformId}/history-2.json`,
      },
    ]

    return {
      enabled: true,
      scenario,
      platforms: debugPlatforms,
      runs: [runningRun, ...historyRuns],
      connectedPlatformIds,
      targetPlatformId: safeTargetPlatformId,
      runningPlatformIds: [safeTargetPlatformId],
    }
  }

  const runByScenario: Record<
    Exclude<HomeImportSourcesScenario, "empty" | "eta-history">,
    Run
  > = {
    "blocking-waiting": makeRun({
      id: "home-debug-blocking-waiting",
      platformId: safeTargetPlatformId,
      statusMessage: "Waiting for sign in...",
      isConnected: false,
    }),
    background: makeRun({
      id: "home-debug-background",
      platformId: safeTargetPlatformId,
      statusMessage: "Collecting data...",
      isConnected: true,
    }),
    "phase-label": makeRun({
      id: "home-debug-phase-label",
      platformId: safeTargetPlatformId,
      statusMessage: "Collecting data...",
      isConnected: true,
      phaseLabel: "Extracting conversations...",
    }),
    "eta-weak": makeRun({
      id: "home-debug-eta-weak",
      platformId: safeTargetPlatformId,
      statusMessage: "Collecting data...",
      isConnected: true,
    }),
    "eta-size": makeRun({
      id: "home-debug-eta-size",
      platformId: safeTargetPlatformId,
      statusMessage: "Collecting data...",
      isConnected: true,
      itemCount: 6200,
    }),
  }

  return {
    enabled: true,
    scenario,
    platforms: debugPlatforms,
    runs: [runByScenario[scenario]],
    connectedPlatformIds,
    targetPlatformId: safeTargetPlatformId,
    runningPlatformIds: [safeTargetPlatformId],
  }
}
