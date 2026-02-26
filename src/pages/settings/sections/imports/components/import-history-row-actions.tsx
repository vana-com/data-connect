import { memo, useState } from "react"
import {
  ChevronDownIcon,
  ChevronUpIcon,
  EllipsisVerticalIcon,
} from "lucide-react"
import { Link } from "react-router-dom"
import { cn } from "@/lib/classes"
import { ROUTES } from "@/config/routes"
import { getPlatformRegistryEntryById } from "@/lib/platform/utils"
import { PlatformIcon } from "@/components/icons/platform-icon"
import { ConfirmAction } from "@/components/elements/confirm-action"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { buttonVariants } from "@/components/ui/button"
import { SettingsConfirmAction } from "@/pages/settings/components/settings-confirm-action"
import { SettingsRowAction } from "@/pages/settings/components/settings-shared"
import type { Platform, Run } from "@/types"

interface ImportHistoryRowActionsProps {
  run: Run
  isStopping: boolean
  isRemoving: boolean
  needsStopConfirm: boolean
  canRunAgain: boolean
  rerunPlatform?: Platform
  isErrorExpanded: boolean
  onStop: () => void
  onRunAgain: (platform: Platform) => void
  onRemove: () => Promise<void>
  onToggleErrorDetail: () => void
}

const ImportHistoryRowActionsInner = ({
  run,
  isStopping,
  isRemoving,
  needsStopConfirm,
  canRunAgain,
  rerunPlatform,
  isErrorExpanded,
  onStop,
  onRunAgain,
  onRemove,
  onToggleErrorDetail,
}: ImportHistoryRowActionsProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false)
  const sourceOverviewRoute = ROUTES.source.replace(
    ":platformId",
    getPlatformRegistryEntryById(run.platformId)?.id ?? run.platformId
  )
  const actionSvgClass =
    "gap-1 [--lucide-stroke-width:2.5] [&_svg:not([data-slot=spinner])]:size-[1.25em]"
  const leftIconPaddingClass = "pl-1!"
  const rightIconPaddingClass = "pr-1.5!"
  const hasMenuActions =
    run.status === "success" ||
    run.status === "error" ||
    run.status === "stopped"
  const canSync = canRunAgain && Boolean(rerunPlatform)

  if (isRemoving) {
    return (
      <div className="flex items-center gap-2">
        <SettingsRowAction
          isLoading
          loadingLabel="Removing…"
          className={actionSvgClass}
        >
          Remove
        </SettingsRowAction>
      </div>
    )
  }

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
                loadingLabel="Stopping…"
                className={actionSvgClass}
              >
                Stop
              </SettingsRowAction>
            }
          />
        ) : (
          <SettingsRowAction
            isLoading={isStopping}
            loadingLabel="Stopping…"
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
    <div className={cn("flex items-center gap-0", hasMenuActions && "-mr-1.5")}>
      {run.status === "success" ? (
        <>
          <SettingsRowAction
            asChild
            className={cn(actionSvgClass, leftIconPaddingClass)}
          >
            <Link to={sourceOverviewRoute}>Open</Link>
          </SettingsRowAction>
          {canSync && rerunPlatform ? (
            <SettingsRowAction
              type="button"
              className={cn(actionSvgClass, rightIconPaddingClass)}
              onClick={() => onRunAgain(rerunPlatform)}
            >
              Sync
            </SettingsRowAction>
          ) : null}
        </>
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
      {hasMenuActions ? (
        <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <DropdownMenuTrigger
            aria-label="More actions"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "[&_svg]:size-[1.25em]!",
              "transition-none",
              "px-1.5!"
            )}
          >
            <EllipsisVerticalIcon aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className={cn(
              "w-40 rounded-button px-1 py-1 shadow-lg",
              "data-open:animate-none data-closed:animate-none duration-0"
            )}
          >
            {run.status !== "success" && canSync && rerunPlatform ? (
              <DropdownMenuItem
                className={itemStyle}
                onSelect={() => onRunAgain(rerunPlatform)}
              >
                Sync
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem
              className={itemStyle}
              variant="destructive"
              onSelect={event => {
                event.preventDefault()
                setIsMenuOpen(false)
                setIsRemoveConfirmOpen(true)
              }}
            >
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
      <ConfirmAction
        title="Remove imported data?"
        description="This deletes the imported data from this device. You can import it again later if needed."
        actionLabel="Remove data"
        onAction={() => void onRemove()}
        open={isRemoveConfirmOpen}
        onOpenChange={setIsRemoveConfirmOpen}
        showTrigger={false}
        media={
          <PlatformIcon iconName={run.platformId} size={24} aria-hidden="true" />
        }
      />
    </div>
  )
}

const itemStyle = "text-compact font-medium px-2.5 py-2.5"

function areImportHistoryRowActionsPropsEqual(
  prev: ImportHistoryRowActionsProps,
  next: ImportHistoryRowActionsProps
) {
  return (
    prev.run.status === next.run.status &&
    prev.run.platformId === next.run.platformId &&
    prev.isStopping === next.isStopping &&
    prev.isRemoving === next.isRemoving &&
    prev.needsStopConfirm === next.needsStopConfirm &&
    prev.canRunAgain === next.canRunAgain &&
    prev.rerunPlatform?.id === next.rerunPlatform?.id &&
    prev.isErrorExpanded === next.isErrorExpanded &&
    prev.onStop === next.onStop &&
    prev.onRunAgain === next.onRunAgain &&
    prev.onRemove === next.onRemove &&
    prev.onToggleErrorDetail === next.onToggleErrorDetail
  )
}

export const ImportHistoryRowActions = memo(
  ImportHistoryRowActionsInner,
  areImportHistoryRowActionsPropsEqual
)
ImportHistoryRowActions.displayName = "ImportHistoryRowActions"
