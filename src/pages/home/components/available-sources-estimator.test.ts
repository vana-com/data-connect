import { describe, expect, it } from "vitest"
import type { Run } from "@/types"
import {
  buildRunningImportExpectationLine,
  estimateImportDurationBand,
} from "./available-sources-estimator"

const NOW_MS = new Date("2026-02-26T12:00:00.000Z").getTime()

function makeRun(overrides: Partial<Run> = {}): Run {
  return {
    id: "run-1",
    platformId: "chatgpt",
    filename: "chatgpt",
    isConnected: true,
    startDate: "2026-02-26T11:53:00.000Z",
    status: "running",
    statusMessage: "Collecting data...",
    url: "",
    company: "OpenAI",
    name: "ChatGPT",
    ...overrides,
  }
}

describe("available-sources-estimator", () => {
  it("hides expectation line while run is blocking user action", () => {
    const run = makeRun({
      isConnected: false,
      statusMessage: "Waiting for sign in...",
      itemCount: 1200,
    })

    const line = buildRunningImportExpectationLine({
      run,
      runs: [run],
      nowMs: NOW_MS,
    })

    expect(line).toBeUndefined()
  })

  it("uses size-aware heuristic band when item count is present", () => {
    const smallRun = makeRun({ id: "run-small", itemCount: 120 })
    const largeRun = makeRun({ id: "run-large", itemCount: 6200 })

    const smallBand = estimateImportDurationBand({
      run: smallRun,
      runs: [smallRun],
      elapsedMinutes: 7,
    })
    const largeBand = estimateImportDurationBand({
      run: largeRun,
      runs: [largeRun],
      elapsedMinutes: 7,
    })

    expect(smallBand.confidence).toBe("heuristic")
    expect(largeBand.confidence).toBe("heuristic")
    expect(largeBand.highMinutes).toBeGreaterThan(smallBand.highMinutes)
  })

  it("falls back to uncertainty copy with weak signal", () => {
    const run = makeRun({
      id: "run-weak",
      itemCount: undefined,
    })

    const line = buildRunningImportExpectationLine({
      run,
      runs: [run],
      nowMs: NOW_MS,
    })

    expect(line).toContain("Can take a while")
    expect(line).toContain("Import in progress")
  })

  it("uses history-derived band when enough completed samples exist", () => {
    const run = makeRun({
      id: "run-current",
      itemCount: 1800,
    })
    const historyRuns: Run[] = [
      makeRun({
        id: "history-1",
        status: "success",
        startDate: "2026-02-26T10:00:00.000Z",
        endDate: "2026-02-26T10:20:00.000Z",
        itemsExported: 1500,
      }),
      makeRun({
        id: "history-2",
        status: "success",
        startDate: "2026-02-26T09:00:00.000Z",
        endDate: "2026-02-26T09:25:00.000Z",
        itemsExported: 2000,
      }),
      run,
    ]

    const band = estimateImportDurationBand({
      run,
      runs: historyRuns,
      elapsedMinutes: 7,
    })

    expect(band.confidence).toBe("heuristic")
    expect(band.lowMinutes).toBeGreaterThanOrEqual(5)
    expect(band.highMinutes).toBeGreaterThan(band.lowMinutes)
  })
})
