import { useCallback, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { ActivityIcon } from "lucide-react"
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
import { ImportHistoryRow } from "./import-history-row"

const STOPPING_UI_MIN_MS = 600

export function ImportHistoryPanel() {
  const { activeImports, finishedImports, platforms, startExport, stopExport } =
    useImportsSection()
  const [expandedErrorRunIds, setExpandedErrorRunIds] = useState<Set<string>>(
    () => new Set()
  )
  const [stoppingRunIds, setStoppingRunIds] = useState<Set<string>>(
    () => new Set()
  )

  const { effectiveActiveImports, effectiveFinishedImports } =
    resolveImportHistoryRuns({
      activeImports,
      finishedImports,
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

  const handleRunAgain = useCallback(
    (platform: Platform) => {
      void startExport(platform)
    },
    [startExport]
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
              isStopping={stoppingRunIds.has(run.id)}
              canRunAgain={!activePlatformIds.has(run.platformId)}
              rerunPlatform={platformById.get(run.platformId)}
              isErrorExpanded={expandedErrorRunIds.has(run.id)}
              onStop={handleStop}
              onRunAgain={handleRunAgain}
              onToggleErrorDetail={toggleErrorDetail}
            />
          ))}
        </SettingsCardStack>
      ) : null}
    </div>
  )
}
