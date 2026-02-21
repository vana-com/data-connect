import { LoaderCircleIcon } from "lucide-react"
import { PlatformIcon } from "@/components/icons/platform-icon"
import { Text } from "@/components/typography/text"
import { openLocalPath } from "@/lib/open-resource"
import { SettingsCard } from "@/pages/settings/components/settings-shared"
import { SettingsRow } from "@/pages/settings/components/settings-row"
import type { Platform, Run } from "@/types"
import { ImportHistoryRowActions } from "./import-history-row-actions"
import {
  getErrorDetail,
  getRowDescription,
  shouldConfirmStop,
} from "./import-history-row-utils"
import { ImportHistoryStatusBadge } from "./import-history-status-badge"

const isTerminalRun = (status: Run["status"]) =>
  status === "success" || status === "error" || status === "stopped"

const toExportDirectoryPath = (exportPath: string) =>
  exportPath.endsWith(".json")
    ? exportPath.replace(/[\\/][^\\/]+$/, "")
    : exportPath

interface ImportHistoryRowProps {
  run: Run
  isStopping: boolean
  canRunAgain: boolean
  rerunPlatform?: Platform
  isErrorExpanded: boolean
  onStop: (runId: string) => void
  onRunAgain: (platform: Platform) => void
  onToggleErrorDetail: (runId: string) => void
}

export function ImportHistoryRow({
  run,
  isStopping,
  canRunAgain,
  rerunPlatform,
  isErrorExpanded,
  onStop,
  onRunAgain,
  onToggleErrorDetail,
}: ImportHistoryRowProps) {
  const isRunning = run.status === "running"
  const isPending = run.status === "pending"
  const canRevealExport = Boolean(run.exportPath && isTerminalRun(run.status))
  const needsStopConfirm = shouldConfirmStop(run)
  const errorDetail = getErrorDetail(run)

  const handleRevealExport = async () => {
    if (!run.exportPath) return
    await openLocalPath(toExportDirectoryPath(run.exportPath))
  }

  return (
    <SettingsCard>
      <SettingsRow
        icon={
          <PlatformIcon
            iconName={run.platformId}
            size={24}
            aria-hidden="true"
          />
        }
        title={
          <div className="flex items-center gap-2">
            <Text as="div" intent="body" weight="semi">
              {run.name}
            </Text>
            {isRunning ? (
              <Text as="span" intent="fine" withIcon color="success">
                <LoaderCircleIcon aria-hidden="true" className="animate-spin" />
                Running
              </Text>
            ) : null}
            {isPending ? (
              <Text as="span" intent="fine" muted>
                Pending
              </Text>
            ) : null}
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
              needsStopConfirm={needsStopConfirm}
              canRunAgain={canRunAgain}
              rerunPlatform={rerunPlatform}
              onStop={() => onStop(run.id)}
              onRunAgain={onRunAgain}
            />
            {isRunning ? null : (
              <ImportHistoryStatusBadge
                run={run}
                isErrorExpanded={isErrorExpanded}
                onToggleErrorDetail={() => onToggleErrorDetail(run.id)}
              />
            )}
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
}
