import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useSelector } from "react-redux"
import { usePlatforms } from "@/hooks/usePlatforms"
import { useConnector } from "@/hooks/useConnector"
import type { Platform, RootState } from "@/types"
import { PageContainer } from "@/components/elements/page-container"
import { DebugTogglePanel } from "@/components/elements/debug-toggle-panel"
import { Text } from "@/components/typography/text"
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
import {
  getHomeImportSourcesScenario,
  HOME_IMPORT_SOURCES_SCENARIO_VALUES,
  isHomeImportSourcesDebugEnabled,
  resolveHomeImportSourcesUiDebugState,
} from "./home-import-sources-ui-debug"
import {
  APP_UPDATE_UI_DEBUG_SCENARIO_VALUES,
  getAppUpdateUiDebugScenario,
  isAppUpdateUiDebugEnabled,
} from "@/hooks/app-update/app-update-ui-debug"

export function Home() {
  const homeDebugScenarioLabel: Record<string, string> = {
    "blocking-waiting": "blocking-waiting",
    background: "background",
    "phase-label": "phase-label",
    "eta-weak": "ETA weak",
    "eta-size": "ETA size",
    "eta-history": "ETA history",
    empty: "empty",
  }

  const location = useLocation()
  const navigate = useNavigate()
  const { platforms, isPlatformConnected, refreshConnectedStatus } =
    usePlatforms()
  const { startImport, stopExport } = useConnector()
  const runs = useSelector((state: RootState) => state.app.runs)
  const [deepLinkInput, setDeepLinkInput] = useState("")
  const knownSuccessfulRunIdsRef = useRef<Set<string> | null>(null)
  const homeUiDebugEnabled = useMemo(
    () => isHomeImportSourcesDebugEnabled(location.search),
    [location.search]
  )
  const currentHomeUiDebugScenario = useMemo(
    () => getHomeImportSourcesScenario(location.search),
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
  const appUpdateUiDebugEnabled = useMemo(
    () => isAppUpdateUiDebugEnabled(location.search),
    [location.search]
  )
  const currentAppUpdateUiDebugScenario = useMemo(
    () => getAppUpdateUiDebugScenario(location.search),
    [location.search]
  )
  const displayPlatforms = platforms

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
      if (scenario) nextParams.set("homeImportSourcesScenario", scenario)
      else nextParams.delete("homeImportSourcesScenario")
      nextParams.delete("scenario")
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
  const setAppUpdateUiDebugScenario = useCallback(
    (scenario: string | null) => {
      const nextParams = new URLSearchParams(location.search)
      if (scenario) nextParams.set("appUpdateScenario", scenario)
      else nextParams.delete("appUpdateScenario")
      navigate({ search: `?${nextParams.toString()}` }, { replace: true })
    },
    [location.search, navigate]
  )

  const connectedCanonicalIdsFromRuns = useMemo(
    () =>
      new Set(
        runs
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
    [runs]
  )

  // Separate available platforms (memoized to avoid re-filtering on every render)
  const connectedPlatformsList = useMemo(() => {
    return displayPlatforms.filter(platform => {
      if (isPlatformConnected(platform.id)) return true
      const canonicalId = getPlatformRegistryEntry(platform)?.id
      return canonicalId
        ? connectedCanonicalIdsFromRuns.has(canonicalId)
        : false
    })
  }, [connectedCanonicalIdsFromRuns, displayPlatforms, isPlatformConnected])

  const connectedPlatformIds = useMemo(
    () => connectedPlatformsList.map(platform => platform.id),
    [connectedPlatformsList]
  )
  const homeImportSourcesDebug = useMemo(
    () =>
      resolveHomeImportSourcesUiDebugState({
        search: location.search,
        realPlatforms: displayPlatforms,
        realRuns: runs,
        realConnectedPlatformIds: connectedPlatformIds,
      }),
    [connectedPlatformIds, displayPlatforms, location.search, runs]
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
        runs,
        platforms: connectedSourcesPlatforms,
        search: location.search,
      }),
    [connectedSourcesPlatforms, location.search, runs]
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
      <div className="space-y-w8">
        <Text as="h1" intent="subtitle" weight="medium">
          Your data
        </Text>
        <ConnectedSourcesList
          platforms={connectedSourcesPlatforms}
          runs={connectedSourcesRuns}
          headline="Your imported data"
          onOpenRuns={handleOpenRuns}
          onSyncSource={handleImportSource}
        />
        <AvailableSourcesList
          platforms={homeImportSourcesDebug.platforms}
          runs={homeImportSourcesDebug.runs}
          onExport={handleImportSource}
          onStopRun={handleStopImport}
          connectedPlatformIds={homeImportSourcesDebug.connectedPlatformIds}
        />
      </div>

      {/* DEV ONLY SHORTCUT: RickRoll /connect link */}
      {import.meta.env.DEV && (
        <DebugTogglePanel title="Home debug" openClassName="w-[900px]">
          <div className="grid grid-cols-12 gap-3 divide-x">
            <div className="col-span-7 space-y-2">
              <div className="space-y-2 pt-1">
                <p className="text-xs font-medium">Imported data</p>
                <div className="flex flex-wrap gap-2">
                  {CONNECTED_SOURCES_UI_DEBUG_SCENARIO_VALUES.map(scenario => (
                    <Button
                      key={scenario}
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
              <div className="space-y-2 pt-1">
                <p className="text-xs font-medium">Import sources</p>
                <div className="flex flex-wrap gap-2">
                  {HOME_IMPORT_SOURCES_SCENARIO_VALUES.map(scenario => (
                    <Button
                      key={scenario}
                      size="xs"
                      variant={
                        currentHomeUiDebugScenario === scenario
                          ? "default"
                          : "outline"
                      }
                      onClick={() => setHomeUiDebugScenario(scenario)}
                    >
                      {homeDebugScenarioLabel[scenario] ?? scenario}
                    </Button>
                  ))}
                  <Button
                    size="xs"
                    variant={homeUiDebugEnabled ? "outline" : "default"}
                    onClick={() => setHomeUiDebugScenario(null)}
                  >
                    real
                  </Button>
                </div>
                {homeUiDebugEnabled ? (
                  <p className="text-[11px] text-foreground-muted">
                    target: {homeImportSourcesDebug.targetPlatformId ?? "none"}{" "}
                    · running:{" "}
                    {homeImportSourcesDebug.runningPlatformIds.join(", ") ||
                      "none"}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2 pt-1">
                <p className="text-xs font-medium">App update toast</p>
                <div className="flex flex-wrap gap-2">
                  {APP_UPDATE_UI_DEBUG_SCENARIO_VALUES.map(scenario => (
                    <Button
                      key={scenario}
                      size="xs"
                      variant={
                        currentAppUpdateUiDebugScenario === scenario
                          ? "default"
                          : "outline"
                      }
                      onClick={() => setAppUpdateUiDebugScenario(scenario)}
                    >
                      {scenario}
                    </Button>
                  ))}
                  <Button
                    size="xs"
                    variant={appUpdateUiDebugEnabled ? "outline" : "default"}
                    onClick={() => setAppUpdateUiDebugScenario(null)}
                  >
                    real
                  </Button>
                </div>
              </div>
            </div>
            <div className="col-span-5 space-y-2">
              <p className="text-xs font-medium">Grant flow</p>
              <div className="flex flex-wrap gap-2">
                <Button size="xs" variant="outline" asChild>
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
