import {
  ActivityIcon,
  ArrowLeftIcon,
  ArrowUpRightIcon,
  ArrowRightIcon,
  FolderIcon,
  RefreshCcwIcon,
  HomeIcon,
} from "lucide-react"
import { ROUTES } from "@/config/routes"
import { PlatformIcon } from "@/components/icons/platform-icon"
import { Text } from "@/components/typography/text"
import { buildSettingsUrl } from "@/pages/settings/url"
import { SourceLinkRow } from "./source-link-row"
import { LINKS } from "@/config/links"

interface SourceSidebarProps {
  sourceId: string
  sourceName: string
  lastUsedLabel: string
  canAccessDebugRuns: boolean
  onOpenSourcePath: () => Promise<void>
}

export function SourceSidebar({
  sourceId,
  sourceName,
  lastUsedLabel,
  canAccessDebugRuns,
  onOpenSourcePath,
}: SourceSidebarProps) {
  const importsSettingsUrl = buildSettingsUrl({
    section: "imports",
    source: sourceId,
  })

  return (
    <aside className="space-y-6 relative">
      {/* <Text
        as={Link}
        to={ROUTES.home}
        intent="small"
        withIcon
        weight="medium"
        className={cn(
          "absolute left-0 top-[-2.5em]",
          "hover:text-foreground gap-1!"
        )}
      >
        <ArrowLeftIcon className="size-[1.1em]!" />
        Back
      </Text> */}
      <div className="space-y-5">
        <div className="flex items-center gap-1.5 ml-[-0.375em] pt-2">
          <PlatformIcon
            iconName={sourceId}
            fallbackLabel={sourceName.charAt(0).toUpperCase()}
            size={28}
          />
          <Text as="h1" intent="subtitle" weight="medium">
            {sourceName}
          </Text>
        </div>

        <div className="flex flex-wrap items-start gap-small lg:gap-w6 lg:flex-col">
          <SourceActivityLinks
            importsSettingsUrl={importsSettingsUrl}
            lastUsedLabel={lastUsedLabel}
            onOpenSourcePath={onOpenSourcePath}
          />
          <hr className="w-full hidden lg:block" />
          <SourceActionLinks
            canAccessDebugRuns={canAccessDebugRuns}
            importsSettingsUrl={importsSettingsUrl}
          />
        </div>
      </div>
    </aside>
  )
}

interface SourceActivityLinksProps {
  importsSettingsUrl: string
  lastUsedLabel: string
  onOpenSourcePath: () => Promise<void>
}

function SourceActivityLinks({
  importsSettingsUrl,
  lastUsedLabel,
  onOpenSourcePath,
}: SourceActivityLinksProps) {
  const lastUsedText =
    lastUsedLabel === "never" ? "Never used" : `Last used ${lastUsedLabel}`

  return (
    <div className="space-y-3">
      <SourceLinkRow
        href="#"
        icon={<FolderIcon aria-hidden />}
        onClick={event => {
          event.preventDefault()
          void onOpenSourcePath()
        }}
      >
        Open exports folder
      </SourceLinkRow>
      <SourceLinkRow href="#" icon={<ActivityIcon aria-hidden />}>
        {lastUsedText}
      </SourceLinkRow>
      <SourceLinkRow
        to={importsSettingsUrl}
        icon={<RefreshCcwIcon aria-hidden />}
      >
        Never synced
      </SourceLinkRow>
    </div>
  )
}

interface SourceActionLinksProps {
  canAccessDebugRuns: boolean
  importsSettingsUrl: string
}

function SourceActionLinks({ importsSettingsUrl }: SourceActionLinksProps) {
  return (
    <nav className="space-y-3">
      <SourceLinkRow
        to={ROUTES.home}
        muted
        className="gap-1"
        trailingIcon={<ArrowRightIcon aria-hidden />}
      >
        Back to Home
      </SourceLinkRow>
      <SourceLinkRow
        to={importsSettingsUrl}
        muted
        className="gap-1"
        trailingIcon={<ArrowRightIcon aria-hidden />}
      >
        Import history
      </SourceLinkRow>
      <SourceLinkRow
        href={LINKS.appBuilderRegistration}
        muted
        className="gap-1"
        trailingIcon={<ArrowUpRightIcon aria-hidden />}
      >
        Build on Vana
      </SourceLinkRow>
      {/* <SourceLinkRow
        href="#"
        muted
        trailingIcon={<ArrowUpRightIcon aria-hidden />}
      >
        Connect to Claude
      </SourceLinkRow>
      <SourceLinkRow
        href="#"
        muted
        trailingIcon={<ArrowUpRightIcon aria-hidden />}
      >
        Connect to ChatGPT
      </SourceLinkRow> */}
    </nav>
  )
}
