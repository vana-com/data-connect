import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  SourceRowList,
  SourceRowActionButton,
  SourceRowWithActions,
} from "@/components/elements/source-row"
import { ActionPanel } from "@/components/typography/button-action"
import { Text } from "@/components/typography/text"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ROUTES } from "@/config/routes"
import { cn } from "@/lib/classes"
import { getLastRunLabel } from "@/lib/platform/ui"
import type { Platform, Run } from "@/types"
import { ChevronRightIcon, RotateCcwIcon } from "lucide-react"
import { Link } from "react-router-dom"
import { isBlockingRun } from "./available-sources-list.policy"

interface ConnectedSourcesListProps {
  platforms: Platform[]
  runs: Run[]
  headline?: string
  onOpenRuns?: (platform: Platform) => void
  onSyncSource?: (platform: Platform) => void
}

type OnboardingMessageState = "empty" | "early" | "mature"
type SyncSourceFeedbackState = "running" | "backgrounding"

function getOnboardingMessageState(
  connectedSourceCount: number
): OnboardingMessageState {
  if (connectedSourceCount === 0) return "empty"
  if (connectedSourceCount <= 2) return "early"
  return "mature"
}

export function ConnectedSourcesList({
  platforms,
  runs,
  headline = "Your sources at the moment.",
  onOpenRuns,
  onSyncSource,
}: ConnectedSourcesListProps) {
  const inFlightSyncPlatformIdsRef = useRef<Set<string>>(new Set())
  const syncFeedbackTimeoutsRef = useRef<
    Record<string, ReturnType<typeof setTimeout>[]>
  >({})
  const [syncFeedbackByPlatformId, setSyncFeedbackByPlatformId] = useState<
    Record<string, SyncSourceFeedbackState>
  >({})
  const clearSyncFeedbackTimers = useCallback((platformId: string) => {
    const existingTimers = syncFeedbackTimeoutsRef.current[platformId] ?? []
    existingTimers.forEach(timer => clearTimeout(timer))
    delete syncFeedbackTimeoutsRef.current[platformId]
  }, [])
  const clearSyncFeedbackForPlatform = useCallback(
    (platformId: string) => {
      inFlightSyncPlatformIdsRef.current.delete(platformId)
      clearSyncFeedbackTimers(platformId)
      setSyncFeedbackByPlatformId(prev => {
        if (!(platformId in prev)) return prev
        const { [platformId]: _ignored, ...rest } = prev
        return rest
      })
    },
    [clearSyncFeedbackTimers]
  )
  const triggerSyncFeedback = useCallback(
    (platform: Platform) => {
      if (!onSyncSource) return
      if (inFlightSyncPlatformIdsRef.current.has(platform.id)) return

      inFlightSyncPlatformIdsRef.current.add(platform.id)
      try {
        onSyncSource(platform)
      } catch (error) {
        console.error("Sync source failed before starting:", error)
        clearSyncFeedbackForPlatform(platform.id)
        return
      }
      clearSyncFeedbackTimers(platform.id)
      setSyncFeedbackByPlatformId(prev => ({
        ...prev,
        [platform.id]: "running",
      }))

      const moveToBackgroundTimer = setTimeout(() => {
        setSyncFeedbackByPlatformId(prev => ({
          ...prev,
          [platform.id]: "backgrounding",
        }))
      }, 3_000)

      const clearFeedbackTimer = setTimeout(() => {
        clearSyncFeedbackForPlatform(platform.id)
      }, 5_000)

      syncFeedbackTimeoutsRef.current[platform.id] = [
        moveToBackgroundTimer,
        clearFeedbackTimer,
      ]
    },
    [clearSyncFeedbackForPlatform, clearSyncFeedbackTimers, onSyncSource]
  )
  useEffect(() => {
    return () => {
      Object.values(syncFeedbackTimeoutsRef.current).forEach(timers => {
        timers.forEach(timer => clearTimeout(timer))
      })
      syncFeedbackTimeoutsRef.current = {}
      inFlightSyncPlatformIdsRef.current.clear()
    }
  }, [])

  const onboardingMessageState = getOnboardingMessageState(platforms.length)
  const hasBlockingRun = useMemo(
    () => runs.some(run => isBlockingRun(run)),
    [runs]
  )
  const activePlatformIds = useMemo(
    () =>
      new Set(
        runs.filter(run => run.status === "running").map(run => run.platformId)
      ),
    [runs]
  )

  if (platforms.length === 0) {
    return (
      <section className="space-y-gap">
        <div className="space-y-1">
          <Text as="h2" weight="medium">
            {headline}
          </Text>
          <PersonalServerOnboardingCopy state={onboardingMessageState} />
        </div>
        <div className="action-outset">
          <ActionPanel>
            <Text weight="medium">No sources yet</Text>
          </ActionPanel>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-gap">
      <div className="space-y-1">
        <Text as="h2" weight="medium">
          {headline}
        </Text>
        <PersonalServerOnboardingCopy state={onboardingMessageState} />
      </div>
      <SourceRowList>
        {platforms.map(platform => {
          const meta = getLastRunLabel(runs, platform.id)
          const hasActiveRun = activePlatformIds.has(platform.id)
          const syncFeedbackState = syncFeedbackByPlatformId[platform.id]
          const isShowingSyncFeedback = Boolean(syncFeedbackState)
          const isSyncDisabled =
            !onSyncSource ||
            hasBlockingRun ||
            hasActiveRun ||
            isShowingSyncFeedback
          const syncTooltipCopy =
            hasActiveRun || syncFeedbackState === "backgrounding"
              ? "Fetching in background"
              : syncFeedbackState === "running"
                ? "Fetching latest data"
                : "Fetch your latest data"
          return (
            <SourceRowWithActions
              key={platform.id}
              iconName={platform.name}
              label={platform.name}
              meta={meta}
              rowAction={{
                onClick: onOpenRuns ? () => onOpenRuns(platform) : undefined,
                disabled: !onOpenRuns,
                ariaLabel: `Open ${platform.name}`,
              }}
              middleSlot={
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SourceRowActionButton
                      className={cn("gap-2.5 pl-3.5 pr-3.5 justify-start")}
                      onClick={
                        !isSyncDisabled
                          ? () => triggerSyncFeedback(platform)
                          : undefined
                      }
                      disabled={isSyncDisabled}
                      aria-label={`Fetch latest data for ${platform.name}`}
                    >
                      {syncFeedbackState ? (
                        <Text
                          as="span"
                          intent="fine"
                          muted
                          className="mt-[0.3em]"
                        >
                          {syncFeedbackState === "running"
                            ? "Fetching…"
                            : "Backgrounding…"}
                        </Text>
                      ) : null}
                      <RotateCcwIcon
                        className={cn(
                          syncFeedbackState &&
                            "animate-[spin_2s_linear_infinite_reverse]"
                        )}
                        aria-hidden
                      />
                    </SourceRowActionButton>
                  </TooltipTrigger>
                  <TooltipContent side="top">{syncTooltipCopy}</TooltipContent>
                </Tooltip>
              }
              endSlotClassName="[&_svg:not([class*='size-']):not([data-slot=spinner])]:size-7!"
              surface="list-item"
              endSlot={
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex h-full w-full items-center justify-center">
                      <ChevronRightIcon aria-hidden />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    View data source details
                  </TooltipContent>
                </Tooltip>
              }
            />
          )
        })}
      </SourceRowList>
    </section>
  )
}

interface PersonalServerOnboardingCopyProps {
  state: OnboardingMessageState
}

const ONBOARDING_COPY: Record<
  OnboardingMessageState,
  {
    serverLinkText: string
    beforeServerLink: string
    afterServerLink: string
    appsCtaLink: string
    afterAppsLink: string
  }
> = {
  empty: {
    beforeServerLink: "Your ",
    serverLinkText: "Personal Server",
    afterServerLink: " is ready. Connect a source to ",
    appsCtaLink: "run apps",
    afterAppsLink: " on it.",
  },
  early: {
    beforeServerLink: "Your data lives in your ",
    serverLinkText: "Personal Server",
    afterServerLink: ". You can now ",
    appsCtaLink: "run apps",
    afterAppsLink: " on it.",
  },
  mature: {
    beforeServerLink: "Managed by your ",
    serverLinkText: "Personal Server",
    afterServerLink: ". You can ",
    appsCtaLink: "run apps",
    afterAppsLink: " on it.",
  },
}

function PersonalServerOnboardingCopy({
  state,
}: PersonalServerOnboardingCopyProps) {
  const copy = ONBOARDING_COPY[state]

  return (
    <Text as="p" intent="small" muted>
      {copy.beforeServerLink}
      <Link
        to={ROUTES.personalServer}
        className="link hover:text-foreground"
      >
        {copy.serverLinkText}
      </Link>
      {copy.afterServerLink}
      <Link to={ROUTES.apps} className="link hover:text-foreground">
        {copy.appsCtaLink}
      </Link>
      {copy.afterAppsLink}
    </Text>
  )
}
