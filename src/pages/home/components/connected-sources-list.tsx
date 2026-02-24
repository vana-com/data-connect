import { SourceRow } from "@/components/elements/source-row"
import {
  ActionButton,
  ActionPanel,
} from "@/components/typography/button-action"
import { Text } from "@/components/typography/text"
import { ROUTES } from "@/config/routes"
import { cn } from "@/lib/classes"
import { getLastRunLabel } from "@/lib/platform/ui"
import { buildSettingsUrl } from "@/pages/settings/url"
import type { Platform, Run } from "@/types"
import { Link } from "react-router-dom"

interface ConnectedSourcesListProps {
  platforms: Platform[]
  runs: Run[]
  headline?: string
  onOpenRuns?: (platform: Platform) => void
}

type OnboardingMessageState = "empty" | "early" | "mature"

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
}: ConnectedSourcesListProps) {
  const onboardingMessageState = getOnboardingMessageState(platforms.length)

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
      <div className="flex flex-col gap-3 action-outset">
        {platforms.map(platform => {
          const meta = getLastRunLabel(runs, platform.id)
          return (
            <ActionButton
              key={platform.id}
              onClick={onOpenRuns ? () => onOpenRuns(platform) : undefined}
              size="xl"
              className={cn("items-start justify-between text-left")}
            >
              <SourceRow
                iconName={platform.name}
                label={platform.name}
                meta={meta}
              />
            </ActionButton>
          )
        })}
      </div>
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
        to={buildSettingsUrl({ section: "personalServer" })}
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
