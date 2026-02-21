import { PlatformIcon } from "@/components/icons/platform-icon"
import { SettingsConfirmAction } from "@/pages/settings/components/settings-confirm-action"
import { SettingsRowAction } from "@/pages/settings/components/settings-shared"
import type { Platform, Run } from "@/types"

interface ImportHistoryRowActionsProps {
  run: Run
  isStopping: boolean
  needsStopConfirm: boolean
  canRunAgain: boolean
  rerunPlatform?: Platform
  onStop: () => void
  onRunAgain: (platform: Platform) => void
}

export function ImportHistoryRowActions({
  run,
  isStopping,
  needsStopConfirm,
  canRunAgain,
  rerunPlatform,
  onStop,
  onRunAgain,
}: ImportHistoryRowActionsProps) {
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
              <PlatformIcon iconName={run.platformId} size={24} aria-hidden="true" />
            }
            trigger={
              <SettingsRowAction isLoading={isStopping} loadingLabel="Stopping...">
                Stop
              </SettingsRowAction>
            }
          />
        ) : (
          <SettingsRowAction
            isLoading={isStopping}
            loadingLabel="Stopping..."
            className="text-foreground-dim hover:text-destructive focus-visible:text-destructive"
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
      {canRunAgain && rerunPlatform ? (
        <SettingsRowAction
          type="button"
          className="text-foreground-dim hover:text-foreground"
          onClick={() => onRunAgain(rerunPlatform)}
        >
          Run again
        </SettingsRowAction>
      ) : null}
    </div>
  )
}
