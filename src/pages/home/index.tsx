import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { MotionConfig } from "motion/react"
import { useLocation, useNavigate } from "react-router-dom"
import { useSelector } from "react-redux"
import { usePlatforms } from "@/hooks/usePlatforms"
import { useConnector } from "@/hooks/useConnector"
import { useConnectedApps } from "@/hooks/useConnectedApps"
import { usePersonalServer } from "@/hooks/usePersonalServer"
import type { Platform, RootState } from "@/types"
import { PageContainer } from "@/components/elements/page-container"
import { DebugTogglePanel } from "@/components/elements/debug-toggle-panel"
import { SlidingTabs } from "@/components/elements/sliding-tabs"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { ConnectedAppsList } from "@/pages/home/components/connected-apps-list"
import { ConnectedSourcesList } from "@/pages/home/components/connected-sources-list"
import { AvailableSourcesList } from "@/pages/home/components/available-sources-list"
import { Button } from "@/components/ui/button"
import { ROUTES } from "@/config/routes"
import {
  buildGrantSearchParams,
  getGrantParamsFromSearchParams,
} from "@/lib/grant-params"
import { getPlatformRegistryEntry } from "@/lib/platform/utils"
import {
  CONNECTED_SOURCES_UI_DEBUG_SCENARIO_VALUES,
  isConnectedSourcesUiDebugEnabled,
  resolveConnectedSourcesUiDebugPlatforms,
  resolveConnectedSourcesUiDebugRuns,
} from "./connected-sources-ui-debug"
import { testConnectedPlatforms, testPlatforms } from "./home-debug-fixtures"
import {
  HOME_UI_DEBUG_SCENARIO_VALUES,
  isHomeUiDebugEnabled,
  resolveHomeUiDebugRuns,
} from "./home-ui-debug"

export function Home() {
  const location = useLocation()
  const navigate = useNavigate()
  const { platforms, isPlatformConnected, refreshConnectedStatus } =
    usePlatforms()
  const { startImport, stopExport } = useConnector()
  const { connectedApps, fetchConnectedApps } = useConnectedApps()
  const personalServer = usePersonalServer()
  const runs = useSelector((state: RootState) => state.app.runs)
  const [activeTab, setActiveTab] = useState("sources")
  const [enableTabMotion, setEnableTabMotion] = useState(false)
  const [deepLinkInput, setDeepLinkInput] = useState("")
  const knownSuccessfulRunIdsRef = useRef<Set<string> | null>(null)

  const tabs = [
    { value: "sources", label: "Your data" },
    { value: "apps", label: "Connected apps" },
  ]
  const homeUiDebugEnabled = useMemo(
    () => isHomeUiDebugEnabled(location.search),
    [location.search]
  )
  const currentHomeUiDebugScenario = useMemo(
    () => new URLSearchParams(location.search).get("scenario"),
    [location.search]
  )
  const connectedSourcesUiDebugEnabled = useMemo(
    () => isConnectedSourcesUiDebugEnabled(location.search),
    [location.search]
  )
  const currentConnectedSourcesUiDebugScenario = useMemo(
    () => new URLSearchParams(location.search).get("connectedSourcesScenario"),
    [location.search]
  )

  const displayPlatforms = platforms
  const displayConnectedApps = connectedApps

  // Fetch connected apps from Personal Server when it becomes available
  useEffect(() => {
    if (personalServer.port && personalServer.status === "running") {
      fetchConnectedApps(personalServer.port, personalServer.devToken)
    }
  }, [
    personalServer.port,
    personalServer.status,
    personalServer.devToken,
    fetchConnectedApps,
  ])

  useEffect(() => {
    const frame = requestAnimationFrame(() => setEnableTabMotion(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    const successfulRunIds = runs
      .filter(run => run.status === "success")
      .map(run => run.id)

    if (knownSuccessfulRunIdsRef.current === null) {
      knownSuccessfulRunIdsRef.current = new Set(successfulRunIds)
      return
    }

    const knownSuccessfulRunIds = knownSuccessfulRunIdsRef.current
    const hasNewSuccess = successfulRunIds.some(runId => {
      if (knownSuccessfulRunIds.has(runId)) return false
      knownSuccessfulRunIds.add(runId)
      return true
    })

    if (hasNewSuccess) {
      void refreshConnectedStatus()
    }
  }, [refreshConnectedStatus, runs])

  const handleImportSource = useCallback(
    async (platform: Platform) => {
      console.log(
        "Starting import for platform:",
        platform.id,
        platform.name,
        "runtime:",
        platform.runtime
      )
      try {
        await startImport(platform)
      } catch (error) {
        console.error("Import failed:", error)
      }
    },
    [startImport]
  )

  const handleStopImport = useCallback(
    async (runId: string) => {
      try {
        await stopExport(runId)
      } catch (error) {
        console.error("Stop import failed:", error)
      }
    },
    [stopExport]
  )

  const handleTestDeepLink = useCallback(() => {
    const trimmed = deepLinkInput.trim()
    if (!trimmed) return
    try {
      const parsed = new URL(trimmed)
      const params = getGrantParamsFromSearchParams(parsed.searchParams)
      if (!params.sessionId && !params.appId) return
      const qs = buildGrantSearchParams(params).toString()
      const route = params.status === "success" ? ROUTES.grant : ROUTES.connect
      navigate(`${route}${qs ? `?${qs}` : ""}`)
    } catch {
      // invalid URL — ignore
    }
  }, [deepLinkInput, navigate])

  const setHomeUiDebugScenario = useCallback(
    (scenario: string | null) => {
      const nextParams = new URLSearchParams(location.search)
      if (scenario) nextParams.set("scenario", scenario)
      else nextParams.delete("scenario")
      navigate({ search: `?${nextParams.toString()}` }, { replace: true })
    },
    [location.search, navigate]
  )
  const setConnectedSourcesUiDebugScenario = useCallback(
    (scenario: string | null) => {
      const nextParams = new URLSearchParams(location.search)
      if (scenario) nextParams.set("connectedSourcesScenario", scenario)
      else nextParams.delete("connectedSourcesScenario")
      navigate({ search: `?${nextParams.toString()}` }, { replace: true })
    },
    [location.search, navigate]
  )

  const availablePlatforms = useMemo(() => {
    if (homeUiDebugEnabled && displayPlatforms.length === 0) {
      return testPlatforms
    }
    return displayPlatforms
  }, [displayPlatforms, homeUiDebugEnabled])

  const displayRuns = useMemo(
    () =>
      resolveHomeUiDebugRuns({
        runs,
        platforms: availablePlatforms,
        search: location.search,
      }),
    [availablePlatforms, location.search, runs]
  )

  const connectedCanonicalIdsFromRuns = useMemo(
    () =>
      new Set(
        displayRuns
          .filter(run => run.status === "success" && Boolean(run.exportPath))
          .map(
            run =>
              getPlatformRegistryEntry({
                id: run.platformId,
                name: run.name,
                company: run.company,
              })?.id
          )
          .filter((id): id is string => Boolean(id))
      ),
    [displayRuns]
  )

  // Separate available platforms (memoized to avoid re-filtering on every render)
  const connectedPlatformsList = useMemo(() => {
    if (homeUiDebugEnabled && displayPlatforms.length === 0) {
      return testConnectedPlatforms
    }
    return displayPlatforms.filter(platform => {
      if (isPlatformConnected(platform.id)) return true
      const canonicalId = getPlatformRegistryEntry(platform)?.id
      return canonicalId
        ? connectedCanonicalIdsFromRuns.has(canonicalId)
        : false
    })
  }, [
    connectedCanonicalIdsFromRuns,
    displayPlatforms,
    homeUiDebugEnabled,
    isPlatformConnected,
  ])

  const connectedPlatformIds = useMemo(
    () => connectedPlatformsList.map(platform => platform.id),
    [connectedPlatformsList]
  )
  const connectedSourcesPlatforms = useMemo(
    () =>
      resolveConnectedSourcesUiDebugPlatforms({
        platforms: connectedPlatformsList,
        search: location.search,
      }),
    [connectedPlatformsList, location.search]
  )
  const connectedSourcesRuns = useMemo(
    () =>
      resolveConnectedSourcesUiDebugRuns({
        runs: displayRuns,
        platforms: connectedSourcesPlatforms,
        search: location.search,
      }),
    [connectedSourcesPlatforms, displayRuns, location.search]
  )

  const handleOpenRuns = useCallback(
    (platform: Platform) => {
      navigate(
        ROUTES.source.replace(
          ":platformId",
          getPlatformRegistryEntry(platform)?.id ?? platform.id
        )
      )
    },
    [navigate]
  )

  return (
    <PageContainer>
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <MotionConfig reducedMotion={enableTabMotion ? "never" : "always"}>
          <SlidingTabs
            tabs={tabs}
            value={activeTab}
            onValueChange={setActiveTab}
            className="pb-w12"
          />
        </MotionConfig>

        {/* SOURCES */}
        <TabsContent value="sources" className="space-y-w8">
          <ConnectedSourcesList
            platforms={connectedSourcesPlatforms}
            runs={connectedSourcesRuns}
            headline="Your imported data"
            onOpenRuns={handleOpenRuns}
          />
          <AvailableSourcesList
            platforms={availablePlatforms}
            runs={displayRuns}
            onExport={handleImportSource}
            onStopRun={handleStopImport}
            connectedPlatformIds={connectedPlatformIds}
          />
        </TabsContent>

        {/* APPS */}
        <TabsContent value="apps">
          <ConnectedAppsList apps={displayConnectedApps} />
        </TabsContent>
      </Tabs>

      {/* DEV ONLY SHORTCUT: RickRoll /connect link */}
      {import.meta.env.DEV && (
        <DebugTogglePanel title="Home debug">
          <div className="grid grid-cols-12 divide-x">
            <div className="col-span-7 space-y-2 pr-4">
              <p className="text-xs font-medium">Import sources</p>
              <div className="flex flex-wrap gap-2">
                {HOME_UI_DEBUG_SCENARIO_VALUES.map(scenario => (
                  <Button
                    key={scenario}
                    type="button"
                    size="xs"
                    variant={
                      currentHomeUiDebugScenario === scenario
                        ? "default"
                        : "outline"
                    }
                    onClick={() => setHomeUiDebugScenario(scenario)}
                  >
                    {scenario}
                  </Button>
                ))}
                <Button
                  type="button"
                  size="xs"
                  variant={homeUiDebugEnabled ? "outline" : "default"}
                  onClick={() => setHomeUiDebugScenario(null)}
                >
                  real
                </Button>
              </div>
              <div className="space-y-2 pt-1">
                <p className="text-xs font-medium">Imported data</p>
                <div className="flex flex-wrap gap-2">
                  {CONNECTED_SOURCES_UI_DEBUG_SCENARIO_VALUES.map(scenario => (
                    <Button
                      key={scenario}
                      type="button"
                      size="xs"
                      variant={
                        currentConnectedSourcesUiDebugScenario === scenario
                          ? "default"
                          : "outline"
                      }
                      onClick={() =>
                        setConnectedSourcesUiDebugScenario(scenario)
                      }
                    >
                      {scenario}
                    </Button>
                  ))}
                  <Button
                    type="button"
                    size="xs"
                    variant={
                      connectedSourcesUiDebugEnabled ? "outline" : "default"
                    }
                    onClick={() => setConnectedSourcesUiDebugScenario(null)}
                  >
                    real
                  </Button>
                </div>
              </div>
            </div>
            <div className="col-span-5 space-y-3 pl-4">
              <p className="text-xs font-medium">Grant flow</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="xs" variant="outline" asChild>
                  <a href="/connect?sessionId=grant-session-1770358735328&appId=rickroll&scopes=%5B%22read%3Achatgpt-conversations%22%5D">
                    Open Rickroll connect
                  </a>
                </Button>
              </div>
              <form
                className="flex flex-col gap-2"
                onSubmit={e => {
                  e.preventDefault()
                  handleTestDeepLink()
                }}
              >
                <input
                  type="text"
                  value={deepLinkInput}
                  onChange={e => setDeepLinkInput(e.target.value)}
                  placeholder="vana://connect?sessionId=...&secret=..."
                  className="rounded border px-2 py-1 text-xs"
                />
                <Button type="submit" size="xs" variant="outline">
                  Test deep link
                </Button>
              </form>
            </div>
          </div>
        </DebugTogglePanel>
      )}
    </PageContainer>
  )
}
