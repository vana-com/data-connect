import {
  ActivityIcon,
  ArrowUpRightIcon,
  FolderIcon,
  RefreshCcwIcon,
} from "lucide-react"
import { PlatformIcon } from "@/components/icons/platform-icon"
import { Text } from "@/components/typography/text"
import { ROUTES } from "@/config/routes"
import { SourceLinkRow } from "./source-link-row"

interface SourceSidebarProps {
  sourceId: string
  sourceName: string
  sourceStoragePath: string
  openSourceHref: string
  canAccessDebugRuns: boolean
  onOpenSourcePath: () => Promise<void>
}

export function SourceSidebar({
  sourceId,
  sourceName,
  sourceStoragePath,
  openSourceHref,
  canAccessDebugRuns,
  onOpenSourcePath,
}: SourceSidebarProps) {
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
            openSourceHref={openSourceHref}
            sourceStoragePath={sourceStoragePath}
            onOpenSourcePath={onOpenSourcePath}
          />
          <hr className="w-full hidden lg:block" />
          <SourceActionLinks canAccessDebugRuns={canAccessDebugRuns} />
        </div>
      </div>
    </aside>
  )
}

interface SourceActivityLinksProps {
  openSourceHref: string
  sourceStoragePath: string
  onOpenSourcePath: () => Promise<void>
}

function SourceActivityLinks({
  openSourceHref,
  sourceStoragePath,
  onOpenSourcePath,
}: SourceActivityLinksProps) {
  return (
    <div className="space-y-3">
      <SourceLinkRow
        href={openSourceHref}
        icon={<FolderIcon aria-hidden />}
        onClick={event => {
          event.preventDefault()
          void onOpenSourcePath()
        }}
      >
        {sourceStoragePath}
      </SourceLinkRow>
      <SourceLinkRow href="#" icon={<ActivityIcon aria-hidden />}>
        Last used yesterday
      </SourceLinkRow>
      <SourceLinkRow to={ROUTES.runs} icon={<RefreshCcwIcon aria-hidden />}>
        Last synced yesterday
      </SourceLinkRow>
    </div>
  )
}

interface SourceActionLinksProps {
  canAccessDebugRuns: boolean
}

function SourceActionLinks({ canAccessDebugRuns }: SourceActionLinksProps) {
  return (
    <nav className="space-y-3">
      <SourceLinkRow
        href="#"
        muted
        trailingIcon={<ArrowUpRightIcon aria-hidden />}
      >
        Build on Vana
      </SourceLinkRow>
      <SourceLinkRow
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
      </SourceLinkRow>
      {canAccessDebugRuns ? (
        <SourceLinkRow
          to={ROUTES.runs}
          muted
          trailingIcon={<ArrowUpRightIcon aria-hidden />}
        >
          Debug runs
        </SourceLinkRow>
      ) : null}
    </nav>
  )
}
