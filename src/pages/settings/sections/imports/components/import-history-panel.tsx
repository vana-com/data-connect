import { useCallback, useMemo, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { ActivityIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DebugTogglePanel } from "@/components/elements/debug-toggle-panel"
import { Text } from "@/components/typography/text"
import { ROUTES } from "@/config/routes"
import {
  SettingsCard,
  SettingsCardStack,
} from "@/pages/settings/components/settings-shared"
import { SettingsRow } from "@/pages/settings/components/settings-row"
import type { Platform } from "@/types"
import { useImportsSection } from "../use-imports-section"
import { resolveImportHistoryRuns } from "./import-history-panel-state"
import {
  IMPORT_HISTORY_UI_DEBUG_SCENARIO_VALUES,
  isImportHistoryUiDebugEnabled,
  resolveImportHistoryUiDebug,
} from "./import-history-ui-debug"
import { ImportHistoryRow } from "./import-history-row"

const STOPPING_UI_MIN_MS = 600

export function ImportHistoryPanel() {
  const location = useLocation()
  const navigate = useNavigate()
  const {
    activeImports,
    finishedImports,
    platforms,
    startImport,
    stopExport,
    removeRun,
  } = useImportsSection()
  const [expandedErrorRunIds, setExpandedErrorRunIds] = useState<Set<string>>(
    () => new Set()
  )
  const [stoppingRunIds, setStoppingRunIds] = useState<Set<string>>(
    () => new Set()
  )
  const [removingRunIds, setRemovingRunIds] = useState<Set<string>>(
    () => new Set()
  )
  const importHistoryUiDebug = useMemo(
    () => resolveImportHistoryUiDebug(location.search),
    [location.search]
  )

  const { effectiveActiveImports, effectiveFinishedImports } =
    resolveImportHistoryRuns({
      activeImports,
      finishedImports,
      uiState: importHistoryUiDebug.uiState ?? undefined,
    })

  const hasNoImports =
    effectiveActiveImports.length === 0 && effectiveFinishedImports.length === 0
  const importRuns = useMemo(
    () =>
      [...effectiveActiveImports, ...effectiveFinishedImports].sort(
        (a, b) =>
          new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
      ),
    [effectiveActiveImports, effectiveFinishedImports]
  )
  const activePlatformIds = useMemo(
    () => new Set(effectiveActiveImports.map(run => run.platformId)),
    [effectiveActiveImports]
  )
  const platformById = useMemo(
    () => new Map(platforms.map(platform => [platform.id, platform])),
    [platforms]
  )
  const effectiveStoppingRunIds = useMemo(() => {
    const merged = new Set(stoppingRunIds)
    importHistoryUiDebug.stoppingRunIds.forEach(runId => merged.add(runId))
    return merged
  }, [importHistoryUiDebug.stoppingRunIds, stoppingRunIds])
  const effectiveRemovingRunIds = useMemo(() => {
    const merged = new Set(removingRunIds)
    importHistoryUiDebug.removingRunIds.forEach(runId => merged.add(runId))
    return merged
  }, [importHistoryUiDebug.removingRunIds, removingRunIds])

  const setImportsDebugScenario = useCallback(
    (scenario: string | null) => {
      const nextParams = new URLSearchParams(location.search)
      if (scenario) nextParams.set("importsScenario", scenario)
      else nextParams.delete("importsScenario")
      navigate({ search: `?${nextParams.toString()}` }, { replace: true })
    },
    [location.search, navigate]
  )

  const handleStop = useCallback(
    async (runId: string) => {
      const startedAt = Date.now()
      setStoppingRunIds(prev => new Set(prev).add(runId))
      try {
        await stopExport(runId)
      } finally {
        const elapsedMs = Date.now() - startedAt
        if (elapsedMs < STOPPING_UI_MIN_MS) {
          await new Promise(resolve =>
            window.setTimeout(resolve, STOPPING_UI_MIN_MS - elapsedMs)
          )
        }
        setStoppingRunIds(prev => {
          const next = new Set(prev)
          next.delete(runId)
          return next
        })
      }
    },
    [stopExport]
  )

  const toggleErrorDetail = useCallback((runId: string) => {
    setExpandedErrorRunIds(prev => {
      const next = new Set(prev)
      if (next.has(runId)) next.delete(runId)
      else next.add(runId)
      return next
    })
  }, [])

  const handleRemove = useCallback(
    async (runId: string) => {
      setRemovingRunIds(prev => {
        if (prev.has(runId)) return prev
        return new Set(prev).add(runId)
      })

      try {
        await removeRun(runId)
      } catch (error) {
        console.error("Failed to remove imported data:", error)
      } finally {
        setRemovingRunIds(prev => {
          const next = new Set(prev)
          next.delete(runId)
          return next
        })
      }
    },
    [removeRun]
  )

  const handleRunAgain = useCallback(
    (platform: Platform) => {
      void startImport(platform)
    },
    [startImport]
  )

  return (
    // varied spacer here so that the filters + list is handled from root
    <div className="space-y-4">
      {hasNoImports ? (
        <>
          <SettingsCardStack>
            <SettingsCard>
              <SettingsRow
                icon={<ActivityIcon aria-hidden="true" />}
                title={
                  <Text as="div" intent="body" weight="semi">
                    No imports yet
                  </Text>
                }
              />
            </SettingsCard>
          </SettingsCardStack>
          <Text as="p" intent="small" muted className="pt-4">
            Start an import from{" "}
            <Text
              as={Link}
              to={ROUTES.home}
              intent="inherit"
              color="inherit"
              link="default"
              className="text-current hover:text-foreground"
            >
              Connect Data on Home
            </Text>
            .
          </Text>
        </>
      ) : null}

      {/* Filters for different sources (coming soon) */}
      {/* {!hasNoImports ? (
        <div className="flex flex-wrap gap-2">
          {sourceFilterOptions.map(option => (
            <Button
              key={option.value}
              type="button"
              variant="outline"
              size="xs"
              selected={selectedSourceFilter === option.value}
              onClick={() => setSourceFilter(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      ) : null} */}

      {importRuns.length > 0 ? (
        <SettingsCardStack>
          {importRuns.map(run => (
            <ImportHistoryRow
              key={run.id}
              run={run}
              isStopping={effectiveStoppingRunIds.has(run.id)}
              isRemoving={effectiveRemovingRunIds.has(run.id)}
              canRunAgain={!activePlatformIds.has(run.platformId)}
              rerunPlatform={platformById.get(run.platformId)}
              isErrorExpanded={expandedErrorRunIds.has(run.id)}
              onStop={handleStop}
              onRunAgain={handleRunAgain}
              onRemove={handleRemove}
              onToggleErrorDetail={toggleErrorDetail}
            />
          ))}
        </SettingsCardStack>
      ) : null}

      {import.meta.env.DEV ? (
        <DebugTogglePanel title="Import history debug">
          <div className="flex flex-wrap gap-2">
            {IMPORT_HISTORY_UI_DEBUG_SCENARIO_VALUES.map(scenario => (
              <Button
                key={scenario}
                type="button"
                size="xs"
                variant={
                  new URLSearchParams(location.search).get("importsScenario") ===
                  scenario
                    ? "default"
                    : "outline"
                }
                onClick={() => setImportsDebugScenario(scenario)}
              >
                {scenario}
              </Button>
            ))}
            <Button
              type="button"
              size="xs"
              variant={isImportHistoryUiDebugEnabled(location.search) ? "outline" : "default"}
              onClick={() => setImportsDebugScenario(null)}
            >
              real
            </Button>
          </div>
        </DebugTogglePanel>
      ) : null}
    </div>
  )
}
