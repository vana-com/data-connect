import { describe, expect, it, vi } from "vitest"
import type { Platform, Run } from "@/types"
import { resolveHomeImportSourcesUiDebugState } from "./home-import-sources-ui-debug"

function makePlatform(id: string): Platform {
  return {
    id,
    company: id,
    name: id,
    filename: id,
    description: `${id} export`,
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

describe("home-import-sources-ui-debug", () => {
  it("empty scenario forces all import cards as connected", () => {
    vi.stubEnv("DEV", true)
    const platforms = [makePlatform("linkedin-playwright"), makePlatform("spotify")]

    const state = resolveHomeImportSourcesUiDebugState({
      search: "?homeImportSourcesScenario=empty",
      realPlatforms: platforms,
      realRuns: [],
      realConnectedPlatformIds: [],
    })

    expect(state.enabled).toBe(true)
    expect(state.scenario).toBe("empty")
    expect(state.runs).toHaveLength(0)
    expect(state.connectedPlatformIds).toEqual(
      expect.arrayContaining(platforms.map(platform => platform.id))
    )
  })

  it("eta-size scenario creates one running run for a visible candidate", () => {
    vi.stubEnv("DEV", true)
    const platforms = [makePlatform("linkedin-playwright"), makePlatform("spotify")]
    const connectedIds = ["linkedin-playwright"]

    const state = resolveHomeImportSourcesUiDebugState({
      search: "?homeImportSourcesScenario=eta-size",
      realPlatforms: platforms,
      realRuns: [],
      realConnectedPlatformIds: connectedIds,
    })

    expect(state.enabled).toBe(true)
    expect(state.scenario).toBe("eta-size")
    expect(state.runs).toHaveLength(1)
    expect(state.runs[0]?.status).toBe("running")
    const runningPlatformId = state.runs[0]?.platformId
    expect(runningPlatformId).toBeTruthy()
    expect(state.connectedPlatformIds).not.toContain(runningPlatformId)
    expect(state.platforms.map(platform => platform.id)).toContain(runningPlatformId)
  })

  it("eta-history scenario injects running and completed history runs", () => {
    vi.stubEnv("DEV", true)
    const platforms = [makePlatform("linkedin-playwright"), makePlatform("spotify")]
    const connectedIds = ["linkedin-playwright"]

    const state = resolveHomeImportSourcesUiDebugState({
      search: "?homeImportSourcesScenario=eta-history",
      realPlatforms: platforms,
      realRuns: [],
      realConnectedPlatformIds: connectedIds,
    })

    expect(state.enabled).toBe(true)
    expect(state.scenario).toBe("eta-history")

    const runningRuns = state.runs.filter(run => run.status === "running")
    const successfulRuns = state.runs.filter(run => run.status === "success")

    expect(runningRuns).toHaveLength(1)
    expect(successfulRuns).toHaveLength(2)

    const runningPlatformId = runningRuns[0]?.platformId
    expect(runningPlatformId).toBeTruthy()
    expect(state.connectedPlatformIds).not.toContain(runningPlatformId)

    for (const run of successfulRuns) {
      expect(run.platformId).toBe(runningPlatformId)
      expect(typeof run.itemsExported).toBe("number")
      expect(run.endDate).toBeTruthy()
    }
  })

  it("non-debug mode passes through real inputs unchanged", () => {
    vi.stubEnv("DEV", false)
    const platforms = [makePlatform("linkedin-playwright")]
    const runs: Run[] = [
      {
        id: "run-1",
        platformId: "linkedin-playwright",
        filename: "linkedin-playwright",
        isConnected: true,
        startDate: new Date().toISOString(),
        status: "running",
        statusMessage: "Collecting data...",
        url: "",
        company: "LinkedIn",
        name: "LinkedIn",
      },
    ]

    const state = resolveHomeImportSourcesUiDebugState({
      search: "?homeImportSourcesScenario=eta-size",
      realPlatforms: platforms,
      realRuns: runs,
      realConnectedPlatformIds: ["linkedin-playwright"],
    })

    expect(state.enabled).toBe(false)
    expect(state.platforms).toBe(platforms)
    expect(state.runs).toBe(runs)
    expect(state.connectedPlatformIds).toEqual(["linkedin-playwright"])
  })
})
