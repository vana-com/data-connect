import { useEffect, useMemo, useState } from "react"
import { ArrowUpRight } from "lucide-react"
import {
  ActionButton,
  ActionPanel,
  actionButtonSurfaceClass,
} from "@/components/typography/button-action"
import { EyebrowBadge } from "@/components/typography/eyebrow-badge"
import { Text } from "@/components/typography/text"
import { Spinner } from "@/components/elements/spinner"
import { SourceStack } from "@/components/elements/source-stack"
import { cn } from "@/lib/classes"
import type { Platform, Run } from "@/types"
import { getConnectSourceEntries } from "@/lib/platform/utils"
import { OpenExternalLink } from "@/components/typography/link-open-external"
import { buildAvailableCards } from "./available-sources-list.lib"
import { ConfirmAction } from "@/components/elements/confirm-action"
import { buttonVariants } from "@/components/ui/button"
import { buildRunningImportExpectationLine } from "./available-sources-estimator"
import {
  getConnectingAccountLine,
  getConnectingStatusLine,
  isBlockingRun,
} from "./available-sources-list.policy"

interface AvailableSourcesListProps {
  platforms: Platform[]
  runs: Run[]
  onExport: (platform: Platform) => void
  onStopRun: (runId: string) => Promise<void> | void
  connectedPlatformIds: string[]
}

export function AvailableSourcesList({
  platforms,
  runs,
  onExport,
  onStopRun,
  connectedPlatformIds,
}: AvailableSourcesListProps) {
  const [stoppingRunId, setStoppingRunId] = useState<string | null>(null)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const connectEntries = useMemo(() => getConnectSourceEntries(), [])
  const connectedPlatformIdSet = useMemo(
    () => new Set(connectedPlatformIds),
    [connectedPlatformIds]
  )
  // Maps platformId → run object for status + phase + account hint rendering.
  const connectingPlatforms = useMemo(() => {
    const map = new Map<string, Run>()
    runs
      .filter(run => run.status === "running")
      .forEach(run => {
        map.set(run.platformId, run)
      })
    return map
  }, [runs])

  const hasBlockingRun = useMemo(() => {
    return runs.some(run => isBlockingRun(run))
  }, [runs])

  useEffect(() => {
    const hasRunning = runs.some(run => run.status === "running")
    if (!hasRunning) return

    const interval = window.setInterval(() => {
      setNowMs(Date.now())
    }, 15000)

    return () => {
      window.clearInterval(interval)
    }
  }, [runs])

  const availableCards = useMemo(
    () =>
      buildAvailableCards({
        connectEntries,
        platforms,
        connectedPlatformIdSet,
        connectingPlatforms,
        onExport,
      }),
    [
      connectEntries,
      platforms,
      connectedPlatformIdSet,
      connectingPlatforms,
      onExport,
    ]
  )

  const stopRun = async (runId: string) => {
    setStoppingRunId(runId)
    try {
      await onStopRun(runId)
    } finally {
      setStoppingRunId(current => (current === runId ? null : current))
    }
  }

  if (availableCards.length === 0) {
    return (
      <section className="space-y-gap">
        <Header />
        <div className="action-outset">
          <ActionPanel>
            <Text weight="medium">All connected (more soon)</Text>
          </ActionPanel>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-gap">
      <Header />
      <div className="grid grid-cols-2 gap-3 action-outset">
        {availableCards.map(
          ({
            cardId,
            iconName,
            label,
            stackPrimaryColor,
            isAvailable,
            isConnecting,
            connectingStatusMessage,
            connectingRun,
            onClick,
          }) => {
            const connectingStatusLine = isConnecting
              ? getConnectingStatusLine(
                  connectingStatusMessage,
                  connectingRun?.phase?.label
                )
              : undefined
            const connectingAccountLine = isConnecting
              ? getConnectingAccountLine(connectingRun)
              : undefined
            const connectingExpectationLine =
              isConnecting && connectingRun
                ? buildRunningImportExpectationLine({
                    run: connectingRun,
                    runs,
                    nowMs,
                  })
                : undefined
            const isConnectingAndBlocking =
              isConnecting && connectingRun
                ? isBlockingRun(connectingRun)
                : false
            const isWaitingForBlockingRun =
              hasBlockingRun && isAvailable && !isConnecting

            const infoSlot = isConnecting ? (
              <div className="ml-auto flex max-w-full flex-col items-end gap-0.5">
                {connectingAccountLine ? (
                  <Text as="p" intent="fine" muted truncate align="right">
                    {connectingAccountLine}
                  </Text>
                ) : null}
                {connectingExpectationLine ? (
                  <Text as="p" intent="fine" muted truncate align="right">
                    {connectingExpectationLine}
                  </Text>
                ) : null}
                <Text as="p" intent="fine" muted truncate align="right">
                  {connectingStatusLine}
                </Text>
                {isConnectingAndBlocking ? (
                  <Text as="p" intent="fine" muted truncate align="right">
                    Finish sign-in to unlock other imports
                  </Text>
                ) : null}
                {connectingRun ? (
                  <ConfirmAction
                    title="Cancel import?"
                    description="This run will stop before completion. You can run it again later."
                    actionLabel="Stop import"
                    onAction={() => {
                      void stopRun(connectingRun.id)
                    }}
                    triggerLabel={
                      stoppingRunId === connectingRun.id
                        ? "Stopping…"
                        : "Cancel import"
                    }
                    triggerButtonProps={{
                      className: cn(
                        "h-auto p-0 text-fine font-normal link text-foreground-muted hover:text-foreground",
                        "disabled:pointer-events-none disabled:opacity-50"
                      ),
                      disabled: stoppingRunId === connectingRun.id,
                    }}
                  />
                ) : null}
              </div>
            ) : null

            const cardContent = (
              <SourceStack
                iconName={iconName}
                label={label}
                stackPrimaryColor={stackPrimaryColor}
                infoSlot={infoSlot}
                showArrow={isAvailable && !isConnecting && !hasBlockingRun}
                trailingSlot={
                  isConnecting ? (
                    <Spinner className="size-4" aria-hidden="true" />
                  ) : isWaitingForBlockingRun ? (
                    <EyebrowBadge
                      variant="outline"
                      className="text-foreground-muted"
                      title="Another import is waiting for sign-in"
                    >
                      Waiting
                    </EyebrowBadge>
                  ) : isAvailable ? null : (
                    <EyebrowBadge
                      variant="outline"
                      className="text-foreground-muted"
                    >
                      soon
                    </EyebrowBadge>
                  )
                }
                labelColor={isAvailable ? "foreground" : "mutedForeground"}
              />
            )

            if (isConnecting) {
              return (
                <div
                  key={cardId}
                  aria-busy
                  aria-selected
                  className={cn(
                    buttonVariants({
                      variant: "outline",
                      size: "xl",
                      fullWidth: true,
                    }),
                    actionButtonSurfaceClass,
                    "h-auto cursor-default p-0 transition-none"
                  )}
                >
                  {cardContent}
                </div>
              )
            }

            return (
              <ActionButton
                key={cardId}
                onClick={onClick}
                disabled={!isAvailable || hasBlockingRun}
                selected={false}
                size="xl"
                className={cn("h-auto p-0 disabled:opacity-100")}
              >
                {cardContent}
              </ActionButton>
            )
          }
        )}
      </div>
    </section>
  )
}

const Header = () => {
  return (
    <div className="flex items-baseline justify-between">
      <Text as="h2" weight="medium">
        Import sources
      </Text>
      <Text as="p" intent="small" muted>
        <OpenExternalLink
          href="https://github.com/vana-com/data-connect?tab=readme-ov-file#creating-a-connector"
          intent="small"
          withIcon
        >
          Add your own
          <ArrowUpRight aria-hidden />
        </OpenExternalLink>
      </Text>
    </div>
  )
}
