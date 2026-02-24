import { useMemo } from "react"
import { ArrowUpRight, PauseIcon } from "lucide-react"
import {
  ActionButton,
  ActionPanel,
} from "@/components/typography/button-action"
import { EyebrowBadge } from "@/components/typography/eyebrow-badge"
import { Text } from "@/components/typography/text"
import { Spinner } from "@/components/elements/spinner"
import { SourceStack } from "@/components/elements/source-row"
import { cn } from "@/lib/classes"
import { DEV_FLAGS } from "@/config/dev-flags"
import type { Platform, Run } from "@/types"
import { getConnectSourceEntries } from "@/lib/platform/utils"
import { OpenExternalLink } from "@/components/typography/link-open-external"
import { buildAvailableCards } from "./available-sources-list.lib"

interface AvailableSourcesListProps {
  platforms: Platform[]
  runs: Run[]
  onExport: (platform: Platform) => void
  connectedPlatformIds: string[]
}

function getConnectingStatusLine(
  statusMessage: string | undefined,
  phaseLabel: string | undefined
): string {
  // Keep this logic in sync with:
  // docs/260222-home-connectors-info-message-matrix.md
  const normalizedPhaseLabel = phaseLabel?.trim()
  if (normalizedPhaseLabel) return normalizedPhaseLabel
  if (!statusMessage) return "Opening browser…"

  const normalizedStatus = statusMessage.trim().toLowerCase()
  if (
    normalizedStatus === "waiting for sign in..." ||
    normalizedStatus === "waiting for sign in…"
  ) {
    return "Waiting for sign-in…"
  }
  if (
    normalizedStatus === "collecting data..." ||
    normalizedStatus === "collecting data…"
  ) {
    return "Importing data…"
  }

  return statusMessage
}

function getConnectingAccountLine(run: Run | undefined): string | undefined {
  // Follow-up target: plumb active account identity from connector-data events into
  // Run while the connector is running, so we are not relying on message text.
  const exportEmail = run?.exportData?.userInfo?.email?.trim()
  if (exportEmail) return `Using ${exportEmail}`

  const statusMessage = run?.statusMessage
  if (!statusMessage) return undefined
  const emailMatch = statusMessage.match(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
  )
  if (!emailMatch) return undefined

  return `Using ${emailMatch[0]}`
}

export function AvailableSourcesList({
  platforms,
  runs,
  onExport,
  connectedPlatformIds,
}: AvailableSourcesListProps) {
  const connectEntries = getConnectSourceEntries()
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

  // ===========================================================================
  // DEBUG ONLY: Home connecting preview override
  // ---------------------------------------------------------------------------
  // ON:  set VITE_USE_HOME_CONNECTING_PREVIEW=true in .env.local
  // OFF: set VITE_USE_HOME_CONNECTING_PREVIEW=false (or remove it)
  //
  // When ON, one card is forced into connecting state so you can QA quickly.
  // - Set an entry id (registry id): "instagram" | "linkedin" | "spotify" | "chatgpt"
  // - Set status to test label mapping:
  //   undefined -> Opening browser…
  //   "Waiting for sign in..." -> Waiting…
  //   "Collecting data..." -> Importing data…
  //
  // IMPORTANT: This is preview scaffolding. Keep it gated by DEV_FLAGS only.
  // ===========================================================================
  const CONNECTING_PREVIEW = {
    enabled: import.meta.env.DEV && DEV_FLAGS.useHomeConnectingPreview,
    platformId: "instagram",
    status: "Importing data…" as string | undefined,
  }

  const hasAnyConnectingRun = useMemo(
    () =>
      CONNECTING_PREVIEW.enabled || runs.some(run => run.status === "running"),
    [CONNECTING_PREVIEW.enabled, runs]
  )

  const availableCards = useMemo(
    () =>
      buildAvailableCards({
        connectEntries,
        platforms,
        connectedPlatformIdSet,
        connectingPlatforms,
        forceConnectingPreview: CONNECTING_PREVIEW.enabled,
        forcedPlatformId: CONNECTING_PREVIEW.platformId,
        forcedStatus: CONNECTING_PREVIEW.status,
        onExport,
      }),
    [
      connectEntries,
      platforms,
      connectedPlatformIdSet,
      connectingPlatforms,
      CONNECTING_PREVIEW.enabled,
      onExport,
    ]
  )

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
            const isPausedByAnotherRun =
              hasAnyConnectingRun && isAvailable && !isConnecting

            return (
              <ActionButton
                key={cardId}
                onClick={onClick}
                disabled={!isAvailable || hasAnyConnectingRun}
                selected={isConnecting}
                size="xl"
                className={cn("h-auto p-0 disabled:opacity-100")}
                aria-busy={isConnecting}
              >
                <SourceStack
                  iconName={iconName}
                  label={label}
                  stackPrimaryColor={stackPrimaryColor}
                  infoSlot={
                    isConnecting ? (
                      <div className="ml-auto flex max-w-full flex-col items-end">
                        <Text as="p" intent="fine" muted truncate align="right">
                          {connectingStatusLine}
                        </Text>
                        {connectingAccountLine ? (
                          <Text
                            as="p"
                            intent="fine"
                            muted
                            truncate
                            align="right"
                          >
                            {connectingAccountLine}
                          </Text>
                        ) : null}
                      </div>
                    ) : null
                  }
                  showArrow={isAvailable && !hasAnyConnectingRun}
                  trailingSlot={
                    isConnecting ? (
                      <Spinner className="size-4" aria-hidden="true" />
                    ) : isPausedByAnotherRun ? (
                      <PauseIcon
                        className="size-4 text-foreground-muted/70"
                        aria-hidden="true"
                      />
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
        Connected sources
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
