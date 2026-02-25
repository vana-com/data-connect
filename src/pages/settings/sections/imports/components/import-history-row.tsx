import { memo, useCallback } from "react"
import { CheckIcon, LoaderCircleIcon, SquareIcon } from "lucide-react"
import { PlatformIcon } from "@/components/icons/platform-icon"
import { Text } from "@/components/typography/text"
import { openExportFolderPath } from "@/lib/open-resource"
import { openPersonalServerScopeFolder } from "@/lib/tauri-paths"
import { SettingsCard } from "@/pages/settings/components/settings-shared"
import { SettingsRow } from "@/pages/settings/components/settings-row"
import type { Platform, Run } from "@/types"
import { ImportHistoryRowActions } from "./import-history-row-actions"
import {
  getErrorDetail,
  getRowDescription,
  shouldConfirmStop,
} from "./import-history-row-utils"

const isTerminalRun = (status: Run["status"]) =>
  status === "success" || status === "error" || status === "stopped"

interface ImportHistoryRowProps {
  run: Run
  isStopping: boolean
  isRemoving: boolean
  canRunAgain: boolean
  rerunPlatform?: Platform
  isErrorExpanded: boolean
  onStop: (runId: string) => void
  onRunAgain: (platform: Platform) => void
  onRemove: (runId: string) => Promise<void>
  onToggleErrorDetail: (runId: string) => void
}

export const ImportHistoryRow = memo(function ImportHistoryRow({
  run,
  isStopping,
  isRemoving,
  canRunAgain,
  rerunPlatform,
  isErrorExpanded,
  onStop,
  onRunAgain,
  onRemove,
  onToggleErrorDetail,
}: ImportHistoryRowProps) {
  const canRevealExport = Boolean(run.exportPath && isTerminalRun(run.status))
  const needsStopConfirm = shouldConfirmStop(run)
  const errorDetail = getErrorDetail(run)

  const handleRevealExport = useCallback(async () => {
    const scope = run.scope
    if (run.syncedToPersonalServer && scope) {
      try {
        await openPersonalServerScopeFolder(scope)
        return
      } catch (error) {
        console.warn("Failed to open personal server scope folder:", error)
      }
    }

    if (!run.exportPath) return
    await openExportFolderPath(run.exportPath)
  }, [run.exportPath, run.scope, run.syncedToPersonalServer])
  const handleStop = useCallback(() => onStop(run.id), [onStop, run.id])
  const handleRemove = useCallback(() => onRemove(run.id), [onRemove, run.id])
  const handleToggleErrorDetail = useCallback(
    () => onToggleErrorDetail(run.id),
    [onToggleErrorDetail, run.id]
  )

  return (
    <SettingsCard>
      <SettingsRow
        icon={<PlatformIcon iconName={run.platformId} size={24} />}
        title={
          <div className="flex items-center gap-2">
            <Text as="div" intent="body" weight="semi">
              {run.name}
            </Text>
            <ImportRunStateLabel status={run.status} />
          </div>
        }
        description={
          <Text as="div" intent="fine" muted>
            {getRowDescription(run)}
            {canRevealExport ? (
              <>
                {" · "}
                <button
                  type="button"
                  className="link hover:text-foreground cursor-pointer"
                  onClick={handleRevealExport}
                >
                  Reveal
                </button>
              </>
            ) : null}
          </Text>
        }
        right={
          <div className="flex items-center gap-2">
            <ImportHistoryRowActions
              run={run}
              isStopping={isStopping}
              isRemoving={isRemoving}
              needsStopConfirm={needsStopConfirm}
              canRunAgain={canRunAgain}
              rerunPlatform={rerunPlatform}
              isErrorExpanded={isErrorExpanded}
              onStop={handleStop}
              onRunAgain={onRunAgain}
              onRemove={handleRemove}
              onToggleErrorDetail={handleToggleErrorDetail}
            />
          </div>
        }
        below={
          run.status === "error" && isErrorExpanded && errorDetail ? (
            <div className="pl-[58px] pr-4 pb-3">
              <hr className="border-border/70" />
              <Text as="p" intent="fine" muted className="pt-3">
                {errorDetail}
              </Text>
            </div>
          ) : null
        }
      />
    </SettingsCard>
  )
})
ImportHistoryRow.displayName = "ImportHistoryRow"

function ImportRunStateLabel({ status }: { status: Run["status"] }) {
  if (status === "running") {
    return (
      <Text as="span" intent="fine" withIcon color="success" weight="medium">
        <LoaderCircleIcon aria-hidden="true" className="animate-spin" />
        Running
      </Text>
    )
  }

  if (status === "pending") {
    return (
      <Text as="span" intent="fine" muted weight="medium">
        Pending
      </Text>
    )
  }

  if (status === "stopped") {
    return (
      <Text as="span" intent="fine" withIcon muted weight="medium">
        <SquareIcon aria-hidden="true" />
        Stopped
      </Text>
    )
  }

  if (status === "success") {
    return (
      <Text as="span" intent="fine" withIcon color="success" weight="medium">
        <CheckIcon aria-hidden="true" className="size-3.5" />
        Imported
      </Text>
    )
  }

  return null
}
