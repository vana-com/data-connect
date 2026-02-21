import { useMemo } from "react"
import { PauseIcon } from "lucide-react"
import { ActionButton } from "@/components/typography/button-action"
import { EyebrowBadge } from "@/components/typography/eyebrow-badge"
import { Text } from "@/components/typography/text"
import { Spinner } from "@/components/elements/spinner"
import { SourceStack } from "@/components/elements/source-row"
import { cn } from "@/lib/classes"
import { DEV_FLAGS } from "@/config/dev-flags"
import type { Platform, Run } from "@/types"
import {
  getConnectSourceEntries,
  getConnectSourceState,
  resolvePlatformForEntry,
} from "@/lib/platform/utils"
import { getPlatformPrimaryColor } from "@/lib/platform/ui"

interface AvailableSourcesListProps {
  platforms: Platform[]
  runs: Run[]
  headline?: string
  onExport: (platform: Platform) => void
  connectedPlatformIds: string[]
}

function getConnectingCardLabel(statusMessage: string | undefined): string {
  if (!statusMessage) return "Opening browser…"

  const normalizedStatus = statusMessage.trim().toLowerCase()
  if (
    normalizedStatus === "waiting for sign in..." ||
    normalizedStatus === "waiting for sign in…"
  ) {
    return "Waiting…"
  }
  if (
    normalizedStatus === "collecting data..." ||
    normalizedStatus === "collecting data…"
  ) {
    return "Importing data…"
  }

  return statusMessage
}

export function AvailableSourcesList({
  platforms,
  runs,
  headline = "Your sources at the moment.",
  onExport,
  connectedPlatformIds,
}: AvailableSourcesListProps) {
  const connectEntries = getConnectSourceEntries()
  const connectedPlatformIdSet = useMemo(
    () => new Set(connectedPlatformIds),
    [connectedPlatformIds]
  )
  // Maps platformId → statusMessage (undefined if no message yet)
  const connectingPlatforms = useMemo(() => {
    const map = new Map<string, string | undefined>()
    runs
      .filter(run => run.status === "running")
      .forEach(run => {
        map.set(run.platformId, run.statusMessage)
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
  const FORCE_CONNECTING_PREVIEW =
    import.meta.env.DEV && DEV_FLAGS.useHomeConnectingPreview
  const FORCED_PLATFORM_ID = "instagram"
  const FORCED_STATUS: string | undefined = "Importing data…"

  const hasAnyConnectingRun = useMemo(
    () =>
      FORCE_CONNECTING_PREVIEW || runs.some(run => run.status === "running"),
    [FORCE_CONNECTING_PREVIEW, runs]
  )

  return (
    <section className="space-y-gap">
      <Text as="h2" weight="medium">
        {headline}
      </Text>
      <div className="grid grid-cols-2 gap-3 action-outset">
        {connectEntries
          .map(entry => {
            const platform = resolvePlatformForEntry(platforms, entry)
            if (platform && connectedPlatformIdSet.has(platform.id)) {
              return null
            }
            const state = getConnectSourceState(entry, platform)
            const shouldForceConnectingPreview =
              FORCE_CONNECTING_PREVIEW &&
              (entry.id === FORCED_PLATFORM_ID ||
                platform?.id === FORCED_PLATFORM_ID)
            const baseIsConnecting = platform
              ? connectingPlatforms.has(platform.id)
              : false
            const baseConnectingStatusMessage = platform
              ? connectingPlatforms.get(platform.id)
              : undefined

            return {
              iconName: entry.displayName,
              label: `Connect ${entry.displayName}`,
              stackPrimaryColor: getPlatformPrimaryColor(entry),
              isAvailable: state === "available",
              isConnecting: shouldForceConnectingPreview
                ? true
                : baseIsConnecting,
              connectingStatusMessage: shouldForceConnectingPreview
                ? FORCED_STATUS
                : baseConnectingStatusMessage,
              onClick:
                state === "available" && platform
                  ? () => onExport(platform)
                  : undefined,
            }
          })
          .filter((card): card is NonNullable<typeof card> => card !== null)
          .map((card, index) => ({
            ...card,
            index,
            priority: card.isAvailable ? 0 : 1,
          }))
          .sort((a, b) => a.priority - b.priority || a.index - b.index)
          .map(
            ({
              iconName,
              label,
              stackPrimaryColor,
              isAvailable,
              isConnecting,
              connectingStatusMessage,
              onClick,
            }) => {
              const cardLabel = isConnecting
                ? getConnectingCardLabel(connectingStatusMessage)
                : label
              const isPausedByAnotherRun =
                hasAnyConnectingRun && isAvailable && !isConnecting

              return (
                <ActionButton
                  key={label}
                  onClick={onClick}
                  disabled={!isAvailable || hasAnyConnectingRun}
                  selected={isConnecting}
                  size="xl"
                  className={cn("h-auto p-0 disabled:opacity-100")}
                  aria-busy={isConnecting}
                >
                  <SourceStack
                    iconName={iconName}
                    label={cardLabel}
                    stackPrimaryColor={stackPrimaryColor}
                    showArrow={isAvailable && !hasAnyConnectingRun}
                    trailingSlot={
                      isConnecting ? (
                        <Spinner className="size-4" aria-hidden="true" />
                      ) : isPausedByAnotherRun ? (
                        <PauseIcon
                          className="size-4 text-foreground/40"
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
