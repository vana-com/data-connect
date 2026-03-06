import { getAppRegistryEntries } from "@/apps/registry"
import { PageContainer } from "@/components/elements/page-container"
import { LearnMoreLink } from "@/components/typography/link-learn-more"
import { Text } from "@/components/typography/text"
import { LINKS } from "@/config/links"
import { ArrowUpRightIcon } from "lucide-react"
import { RegistryAppCard } from "./components/registry-app-card"
import { cn } from "@/lib/utils"

export function DataApps() {
  const apps = getAppRegistryEntries()

  return (
    <PageContainer className="space-y-w12">
      {/* sticky top-[76px] z-10 */}
      <div className="space-y-2">
        <Text as="h1" intent="subtitle" weight="medium">
          Data Apps
        </Text>
        <Text as="p" intent="small" dim>
          Create apps with the&nbsp;
          <LearnMoreLink
            href={LINKS.vanaDocsProtocol}
            className="inline-flex items-center gap-px!"
          >
            Vana Data Protocol
          </LearnMoreLink>
          . Here's an{" "}
          <LearnMoreLink
            href={LINKS.appBuilderExample}
            className="inline-flex items-center gap-px!"
          >
            example to fork
          </LearnMoreLink>
          .
          <br />
          Already have an app?&nbsp;
          <LearnMoreLink
            href={LINKS.appSubmissionGuide}
            className="inline-flex items-center gap-px!"
          >
            Submit via GitHub
            <ArrowUpRightIcon aria-hidden="true" className="size-em" />
          </LearnMoreLink>
        </Text>
      </div>

      <section className="md:-mx-w24 lg:-mx-w48 xl:-mx-w64">
        <div
          className={cn(
            "grid gap-3",
            "md:grid-cols-2",
            "xl:grid-cols-3"
            // 2xl:grid-cols-4"
          )}
        >
          {apps.map(app => (
            <RegistryAppCard key={app.id} app={app} />
          ))}
        </div>
      </section>
    </PageContainer>
  )
}
