import { memo, useCallback } from "react"
import {
  AlertCircle as AlertCircleIcon,
  ArrowUpCircle as ArrowUpCircleIcon,
  Download as DownloadIcon,
  Loader2 as Loader2Icon,
  RefreshCw as RefreshCwIcon,
  Sparkles as SparklesIcon,
} from "lucide-react"

import { PlatformIcon } from "@/components/icons/platform-icon"
import { stateFocus } from "@/components/typography/field"
import { Text } from "@/components/typography/text"
import { cn } from "@/lib/utils"
import { useConnectorUpdates } from "@/hooks/useConnectorUpdates"
import type { ConnectorUpdateInfo } from "@/types"

const updatesPanelClassName = cn([
  // layout
  "space-y-3",
  // shape
  "rounded-card",
  // borders + background
  "border border-border bg-muted",
  // spacing
  "p-4",
])

const updateItemClassName = cn([
  // layout
  "flex items-center gap-3",
  // spacing
  "px-4 py-3",
  // shape
  "rounded-card",
  // borders + background
  "border border-border bg-background",
])

const updateIconWrapperClassName = cn([
  // layout
  "flex items-center justify-center shrink-0",
  // size
  "size-9",
  // shape
  "rounded-card",
  // borders + background
  "border border-border bg-muted",
])

const updateInfoClassName = cn([
  // layout
  "flex min-w-0 flex-1 flex-col",
  // spacing
  "gap-1.5",
])

const updateBadgeBaseClassName = cn([
  // layout
  "inline-flex items-center gap-1",
  // spacing
  "px-1.5 py-0.5",
  // shape
  "rounded",
])

const getBadgeClassName = (variant: "new" | "update" | "current") =>
  cn(
    updateBadgeBaseClassName,
    variant === "new" && "bg-primary-100 text-primary-700",
    variant === "update" && "bg-secondary text-secondary-foreground",
    variant === "current" && "bg-muted text-muted-foreground"
  )

const getActionButtonClassName = (isDownloading: boolean) =>
  cn(
    [
      // layout
      "inline-flex items-center gap-1.5",
      // spacing
      "px-3 py-1.5",
      // shape
      "rounded-button",
      // focus
      stateFocus,
      // disabled
      "disabled:pointer-events-none disabled:opacity-50",
      // transitions
      "transition-colors",
    ],
    isDownloading
      ? "bg-muted text-muted-foreground"
      : "bg-primary-500 text-primary-50 hover:bg-primary-600"
  )

const refreshButtonClassName = cn([
  // layout
  "inline-flex items-center gap-1",
  // spacing
  "px-2 py-1",
  // shape
  "rounded-md",
  // colors
  "text-muted-foreground",
  // focus
  stateFocus,
  // disabled
  "disabled:pointer-events-none disabled:opacity-50",
  // transitions
  "transition-colors",
  // states
  "hover:bg-muted hover:text-foreground",
])

const updatesBadgeButtonClassName = cn([
  // layout
  "inline-flex items-center gap-1.5",
  // spacing
  "px-3 py-1.5",
  // shape
  "rounded-full",
  // borders + background
  "border border-primary-200 bg-primary-50",
  // colors
  "text-primary-700",
  // focus
  stateFocus,
  // transitions
  "transition-colors",
  // states
  "hover:bg-primary-100",
])

interface ConnectorUpdateItemProps {
  update: ConnectorUpdateInfo
  onDownload: (id: string) => void
  isDownloading: boolean
}

const ConnectorUpdateItem = memo(function ConnectorUpdateItem({
  update,
  onDownload,
  isDownloading,
}: ConnectorUpdateItemProps) {
  const badgeVariant = update.isNew
    ? "new"
    : update.hasUpdate
      ? "update"
      : "current"
  const badgeLabel = update.isNew
    ? "New"
    : update.hasUpdate
      ? "Update"
      : "Current"
  const versionLabel =
    update.isNew || !update.currentVersion
      ? `v${update.latestVersion}`
      : `v${update.currentVersion} → v${update.latestVersion}`

  return (
    <div className={updateItemClassName}>
      {/* Icon */}
      <div className={updateIconWrapperClassName}>
        <PlatformIcon iconName={update.name} />
      </div>

      {/* Info */}
      <div className={updateInfoClassName}>
        <div className="flex min-w-0 items-center gap-2">
          <Text as="span" intent="small" weight="medium" truncate>
            {update.name}
          </Text>
          <span className={getBadgeClassName(badgeVariant)}>
            {update.isNew ? (
              <SparklesIcon className="size-3.5" aria-hidden />
            ) : (
              <ArrowUpCircleIcon className="size-3.5" aria-hidden />
            )}
            <Text as="span" intent="fine" weight="medium" color="inherit">
              {badgeLabel}
            </Text>
          </span>
        </div>
        <Text as="span" intent="small" color="mutedForeground">
          {versionLabel}
        </Text>
      </div>

      {/* Download button */}
      <button
        type="button"
        onClick={() => onDownload(update.id)}
        disabled={isDownloading}
        className={getActionButtonClassName(isDownloading)}
      >
        {isDownloading ? (
          <>
            <Loader2Icon
              className="size-3.5 animate-spin motion-reduce:animate-none"
              aria-hidden
            />
            <Text as="span" intent="button" color="inherit">
              Installing…
            </Text>
          </>
        ) : (
          <>
            <DownloadIcon className="size-3.5" aria-hidden />
            <Text as="span" intent="button" color="inherit">
              {update.isNew ? "Install" : "Update"}
            </Text>
          </>
        )}
      </button>
    </div>
  )
})

interface ConnectorUpdatesProps {
  onReloadPlatforms?: () => void | Promise<void>
}

export function ConnectorUpdates({ onReloadPlatforms }: ConnectorUpdatesProps) {
  const {
    updates,
    isCheckingUpdates,
    error,
    checkForUpdates,
    downloadConnector,
    isDownloading,
  } = useConnectorUpdates()

  // Wrap downloadConnector to reload platforms after successful download
  const handleDownload = useCallback(
    async (id: string) => {
      const success = await downloadConnector(id)
      if (success && onReloadPlatforms) {
        await onReloadPlatforms()
      }
    },
    [downloadConnector, onReloadPlatforms]
  )

  if (updates.length === 0 && !isCheckingUpdates && !error) {
    return null
  }

  return (
    <div className={cn(updatesPanelClassName, "mb-6")}>
      {/* Header */}
      <div
        className={cn(
          "flex items-center justify-between",
          updates.length > 0 ? "mb-3" : "mb-0"
        )}
      >
        <div className="flex items-center gap-2">
          <DownloadIcon className="size-4 text-primary-500" aria-hidden />
          <Text as="span" intent="small" weight="medium">
            {updates.length > 0
              ? `${updates.length} Connector${updates.length > 1 ? "s" : ""} Available`
              : "Checking for updates…"}
          </Text>
        </div>
        <button
          type="button"
          onClick={() => checkForUpdates(true)}
          disabled={isCheckingUpdates}
          className={refreshButtonClassName}
        >
          <RefreshCwIcon
            className={cn(
              "size-3",
              isCheckingUpdates && "animate-spin motion-reduce:animate-none"
            )}
            aria-hidden
          />
          <Text as="span" intent="small" color="inherit">
            Refresh
          </Text>
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-2 rounded-card border border-destructive/20 bg-destructive/10 px-3 py-2">
          <AlertCircleIcon className="size-4 text-destructive" aria-hidden />
          <Text as="span" intent="small" color="destructive">
            {error}
          </Text>
        </div>
      )}

      {/* Updates list */}
      <div className="space-y-2">
        {updates.map(update => {
          const downloading = isDownloading(update.id)
          return (
            <ConnectorUpdateItem
              key={update.id}
              update={update}
              onDownload={handleDownload}
              isDownloading={downloading}
            />
          )
        })}
      </div>
    </div>
  )
}

interface ConnectorUpdatesBadgeProps {
  onClick?: () => void
}

export function ConnectorUpdatesBadge({ onClick }: ConnectorUpdatesBadgeProps) {
  const { updateCount, isCheckingUpdates } = useConnectorUpdates()

  if (updateCount === 0 && !isCheckingUpdates) {
    return null
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={updatesBadgeButtonClassName}
    >
      {isCheckingUpdates ? (
        <>
          <Loader2Icon
            className="size-3.5 animate-spin motion-reduce:animate-none"
            aria-hidden
          />
          <Text as="span" intent="small" color="inherit">
            Checking…
          </Text>
        </>
      ) : (
        <>
          <DownloadIcon className="size-3.5" aria-hidden />
          <Text as="span" intent="small" color="inherit">
            {updateCount} update{updateCount > 1 ? "s" : ""} available
          </Text>
        </>
      )}
    </button>
  )
}
