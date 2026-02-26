import { PlatformIcon } from "@/components/icons/platform-icon"
import { Text } from "@/components/typography/text"
import { LINKS } from "@/config/links"
import { openExternalUrl } from "@/lib/open-resource"
import { ROUTES } from "@/config/routes"
import { buildSettingsUrl } from "@/pages/settings/url"
import {
  ActivityIcon,
  ArrowLeftIcon,
  ArrowUpRightIcon,
  ArrowRightIcon,
} from "lucide-react"
import { SourceLinkRow } from "./source-link-row"

interface SourceSidebarProps {
  sourceId: string
  sourceName: string
  lastUsedLabel: string
}

export function SourceSidebar({
  sourceId,
  sourceName,
  lastUsedLabel,
}: SourceSidebarProps) {
  const importsSettingsUrl = buildSettingsUrl({
    section: "imports",
    source: sourceId,
  })
  const lastUsedText =
    lastUsedLabel === "never" ? "Never used" : `Last used ${lastUsedLabel}`

  return (
    <aside className="space-y-gap px-3 lg:px-0">
      <div className="flex items-center gap-2 ml-[-0.25em] pt-2 pb-0">
        <PlatformIcon
          iconName={sourceId}
          fallbackLabel={sourceName.charAt(0).toUpperCase()}
          size={28}
        />
        <Text as="h1" intent="subtitle" weight="medium">
          {sourceName}
        </Text>
      </div>

      <Text
        as="p"
        intent="small"
        muted
        className="text-balance lg:text-pretty pb-1"
      >
        Full export JSON on your Personal Server. Use Open Folder for the file
        path or Copy JSON to paste into your app/agent.
      </Text>

      <div className="flex flex-wrap items-start gap-w8 lg:gap-3.5 lg:flex-col">
        <SourceLinkRow icon={<ActivityIcon aria-hidden />}>
          {lastUsedText}
        </SourceLinkRow>

        {/* NAV */}
        <hr className={ruleStyle} />
        <SourceLinkRow to={ROUTES.home} icon={<ArrowLeftIcon aria-hidden />}>
          <span className="lg:hidden">Home</span>
          <span className="hidden lg:inline">Back to Home</span>
        </SourceLinkRow>
        <SourceLinkRow
          to={importsSettingsUrl}
          icon={<ArrowRightIcon aria-hidden />}
        >
          <span className="lg:hidden">Import history</span>
          <span className="hidden lg:inline">View import history</span>
        </SourceLinkRow>

        {/* VANA */}
        <hr className={ruleStyle} />
        <SourceLinkRow
          href={LINKS.appBuilderRegistration}
          muted
          className="ml-auto lg:ml-0"
          icon={<ArrowUpRightIcon aria-hidden />}
          onClick={event => {
            event.preventDefault()
            void openExternalUrl(LINKS.appBuilderRegistration)
          }}
        >
          Build on Vana
        </SourceLinkRow>
      </div>
    </aside>
  )
}

const ruleStyle = "w-full hidden lg:block border-ring/25"
