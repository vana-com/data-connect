import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react"
import { Link } from "react-router-dom"
import { cn } from "@/lib/classes"
import { ROUTES } from "@/config/routes"
import { getPlatformRegistryEntryById } from "@/lib/platform/utils"
import { PlatformIcon } from "@/components/icons/platform-icon"
import { SettingsConfirmAction } from "@/pages/settings/components/settings-confirm-action"
import { SettingsRowAction } from "@/pages/settings/components/settings-shared"
import type { Platform, Run } from "@/types"
import { getStatusLabel } from "./import-history-row-utils"

interface ImportHistoryRowActionsProps {
  run: Run
  isStopping: boolean
  needsStopConfirm: boolean
  canRunAgain: boolean
  rerunPlatform?: Platform
  isErrorExpanded: boolean
  onStop: () => void
  onRunAgain: (platform: Platform) => void
  onToggleErrorDetail: () => void
}

export function ImportHistoryRowActions({
  run,
  isStopping,
  needsStopConfirm,
  canRunAgain,
  rerunPlatform,
  isErrorExpanded,
  onStop,
  onRunAgain,
  onToggleErrorDetail,
}: ImportHistoryRowActionsProps) {
  const sourceOverviewRoute = ROUTES.source.replace(
    ":platformId",
    getPlatformRegistryEntryById(run.platformId)?.id ?? run.platformId
  )
  const actionSvgClass =
    "gap-1 [--lucide-stroke-width:2.5] [&_svg:not([data-slot=spinner])]:size-[1.25em]"
  const leftIconPaddingClass = "pl-1"
  const rightIconPaddingClass = "pr-1"

  if (run.status === "running") {
    return (
      <div className="flex items-center gap-2">
        {needsStopConfirm ? (
          <SettingsConfirmAction
            title="Stop import?"
            description="This run will stop before completion. You can run it again later."
            actionLabel="Stop import"
            onAction={onStop}
            media={
              <PlatformIcon
                iconName={run.platformId}
                size={24}
                aria-hidden="true"
              />
            }
            trigger={
              <SettingsRowAction
                isLoading={isStopping}
                loadingLabel="Stopping..."
                className={actionSvgClass}
              >
                Stop
              </SettingsRowAction>
            }
          />
        ) : (
          <SettingsRowAction
            isLoading={isStopping}
            loadingLabel="Stopping..."
            className={cn(
              actionSvgClass,
              "text-foreground-dim hover:text-destructive focus-visible:text-destructive"
            )}
            onClick={onStop}
          >
            Stop
          </SettingsRowAction>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {run.status === "success" ? (
        <SettingsRowAction
          asChild
          className={cn(actionSvgClass, leftIconPaddingClass)}
        >
          <Link to={sourceOverviewRoute}>
            <CheckIcon aria-hidden="true" className="text-success-foreground" />
            View Source
          </Link>
        </SettingsRowAction>
      ) : null}
      {run.status === "error" ? (
        <SettingsRowAction
          type="button"
          className={cn(
            actionSvgClass,
            rightIconPaddingClass,
            "text-destructive-foreground hover:text-destructive-foreground"
          )}
          aria-expanded={isErrorExpanded}
          aria-label={`${isErrorExpanded ? "Hide" : "Show"} failed run details`}
          onClick={onToggleErrorDetail}
        >
          Failed
          {isErrorExpanded ? (
            <ChevronUpIcon aria-hidden="true" />
          ) : (
            <ChevronDownIcon aria-hidden="true" />
          )}
        </SettingsRowAction>
      ) : null}
      {run.status === "stopped" ? (
        <SettingsRowAction
          type="button"
          disabled
          className={cn(actionSvgClass, "text-foreground-dim")}
        >
          {getStatusLabel(run.status)}
        </SettingsRowAction>
      ) : null}

      {/* Purposefully hidden for now.  */}
      {canRunAgain && rerunPlatform ? (
        <SettingsRowAction
          type="button"
          className={cn(
            actionSvgClass,
            "text-foreground-dim hover:text-foreground",
            // hide it for now!
            "hidden"
          )}
          onClick={() => onRunAgain(rerunPlatform)}
        >
          Run again
        </SettingsRowAction>
      ) : null}
    </div>
  )
}
