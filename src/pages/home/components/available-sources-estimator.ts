import type { Run } from "@/types"
import { isBlockingRun } from "./available-sources-list.policy"

/**
 * Why this module exists
 *
 * We need "time-to-finish" guidance on running import cards without lying to users. Exact countdowns look fake and break trust, so this module intentionally returns coarse expectation bands instead of precise ETA values.
 *
 * What this does (phase-1 ship)
 *
 * 1) Never show expectation copy during blocking states
 *    - If a run still needs user action (sign-in/browser handoff), we return `undefined`.
 *    - The UI should prioritize blocking instructions, not ETA messaging.
 *
 * 2) Build one concise expectation line for background imports
 *    - Shape: "<items/import label> · <elapsed> · <expectation text>"
 *    - Example: "1,438 items · 7m elapsed · Usually 10-25m"
 *
 * 3) Estimate duration band with layered signal quality
 *    - history band: completed same-platform runs with items + duration
 *    - heuristic band: platform baseline + current item-count size bucket
 *    - weak band: if signal is poor, fallback to "Can take a while"
 *
 * 4) Enforce elapsed floor
 *    - If elapsed time already exceeds the predicted band, widen the band upward.
 *    - Prevents impossible output like "Usually 10-20m" when 35m has already elapsed.
 *
 * Non-goals in this phase
 *
 * - No per-second countdown.
 * - No claim of exact completion time.
 * - No account-identity keyed modeling yet (platform + size is enough for v1 scaffold).
 *
 * Provenance (archived design docs)
 *
 * - docs/_archive/260224-home-connector-blocking-and-parallelization.md
 * - docs/_archive/260222-home-connectors-info-message-matrix.md
 * - docs/_archive/260222-home-available-sources-status-slot.md
 */
type ExpectationConfidence = "weak" | "heuristic" | "history"

interface DurationBand {
  lowMinutes: number
  highMinutes: number
  confidence: ExpectationConfidence
}

interface BuildExpectationLineInput {
  run: Run
  runs: Run[]
  nowMs: number
}

const PLATFORM_BASELINE_BANDS: Record<string, readonly [number, number]> = {
  chatgpt: [10, 25],
  instagram: [6, 18],
  linkedin: [8, 22],
  spotify: [5, 15],
}

const SIZE_BANDS: Array<{
  minItems: number
  band: readonly [number, number]
}> = [
  { minItems: 5000, band: [45, 90] },
  { minItems: 2000, band: [25, 60] },
  { minItems: 500, band: [12, 35] },
  { minItems: 100, band: [8, 22] },
  { minItems: 0, band: [5, 15] },
]

export function buildRunningImportExpectationLine({
  run,
  runs,
  nowMs,
}: BuildExpectationLineInput): string | undefined {
  if (isBlockingRun(run)) return undefined

  const elapsedMs = nowMs - new Date(run.startDate).getTime()
  const safeElapsedMs = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0
  const elapsedMinutes = Math.floor(safeElapsedMs / 60000)
  const elapsedLabel =
    elapsedMinutes < 1 ? "<1m elapsed" : `${elapsedMinutes}m elapsed`

  const itemCountLabel =
    typeof run.itemCount === "number" && run.itemCount >= 0
      ? `${new Intl.NumberFormat().format(run.itemCount)} items`
      : "Import in progress"

  const band = estimateImportDurationBand({
    run,
    runs,
    elapsedMinutes,
  })

  const expectationText =
    band.confidence === "weak"
      ? "Can take a while"
      : `Usually ${band.lowMinutes}-${band.highMinutes}m`

  return `${itemCountLabel} · ${elapsedLabel} · ${expectationText}`
}

export function estimateImportDurationBand({
  run,
  runs,
  elapsedMinutes,
}: {
  run: Run
  runs: Run[]
  elapsedMinutes: number
}): DurationBand {
  const historyBand = estimateHistoryBand(run, runs)
  if (historyBand) {
    return enforceElapsedFloor(historyBand, elapsedMinutes)
  }

  const heuristicBand = estimateHeuristicBand(run)
  return enforceElapsedFloor(heuristicBand, elapsedMinutes)
}

function estimateHistoryBand(run: Run, runs: Run[]): DurationBand | undefined {
  const currentItemCount =
    typeof run.itemCount === "number" && run.itemCount > 0
      ? run.itemCount
      : null
  if (!currentItemCount) return undefined

  const throughputs = runs
    .filter(candidate => candidate.id !== run.id)
    .filter(candidate => candidate.platformId === run.platformId)
    .filter(candidate => candidate.status === "success")
    .map(candidate => {
      const items = candidate.itemsExported
      if (typeof items !== "number" || items <= 0) return null
      if (!candidate.endDate) return null

      const durationMs =
        new Date(candidate.endDate).getTime() -
        new Date(candidate.startDate).getTime()
      if (!Number.isFinite(durationMs) || durationMs <= 0) return null

      const durationMinutes = durationMs / 60000
      const throughput = items / durationMinutes
      if (!Number.isFinite(throughput) || throughput <= 0) return null

      return throughput
    })
    .filter((throughput): throughput is number => throughput !== null)

  if (throughputs.length < 2) return undefined

  const medianThroughput = getMedian(throughputs)
  const estimatedTotalMinutes = clamp(
    currentItemCount / medianThroughput,
    5,
    6 * 60
  )

  const lowMinutes = roundToNearest5(Math.max(5, estimatedTotalMinutes * 0.7))
  const highMinutes = roundToNearest5(
    Math.max(lowMinutes + 5, estimatedTotalMinutes * 1.4)
  )

  return {
    lowMinutes,
    highMinutes,
    confidence: throughputs.length >= 5 ? "history" : "heuristic",
  }
}

function estimateHeuristicBand(run: Run): DurationBand {
  const platformBand = PLATFORM_BASELINE_BANDS[run.platformId] ?? [10, 30]
  const sizeBand = getSizeBand(run.itemCount)

  const lowMinutes = Math.max(platformBand[0], sizeBand[0])
  const highMinutes = Math.max(platformBand[1], sizeBand[1])

  const hasItemCount = typeof run.itemCount === "number" && run.itemCount >= 0

  return {
    lowMinutes: roundToNearest5(lowMinutes),
    highMinutes: roundToNearest5(Math.max(lowMinutes + 5, highMinutes)),
    confidence: hasItemCount ? "heuristic" : "weak",
  }
}

function getSizeBand(itemCount: number | undefined): readonly [number, number] {
  if (typeof itemCount !== "number" || itemCount < 0) return [10, 30]

  for (const sizeBand of SIZE_BANDS) {
    if (itemCount >= sizeBand.minItems) return sizeBand.band
  }

  return [10, 30]
}

function enforceElapsedFloor(
  band: DurationBand,
  elapsedMinutes: number
): DurationBand {
  const safeElapsed = Number.isFinite(elapsedMinutes)
    ? Math.max(0, elapsedMinutes)
    : 0
  if (safeElapsed <= band.highMinutes) return band

  const extendedLow = roundToNearest5(Math.max(5, safeElapsed * 0.8))
  const extendedHigh = roundToNearest5(
    Math.max(extendedLow + 5, safeElapsed * 1.5)
  )

  return {
    ...band,
    lowMinutes: extendedLow,
    highMinutes: extendedHigh,
  }
}

function roundToNearest5(value: number): number {
  return Math.max(5, Math.round(value / 5) * 5)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function getMedian(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const midpoint = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return (sorted[midpoint - 1] + sorted[midpoint]) / 2
  }
  return sorted[midpoint]
}
