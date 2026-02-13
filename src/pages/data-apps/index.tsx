import { LearnMoreLink } from "@/components/typography/link-learn-more"
import { Text } from "@/components/typography/text"
import { getAppRegistryEntries } from "@/apps/registry"
import { AppCard } from "./components/AppCard"

export function DataApps() {
  const apps = getAppRegistryEntries()

  return (
    <div className="py-w16">
      <div className="space-y-w12">
        {/* sticky top-[76px] z-10 */}
        <div className="container space-y-gap">
          <Text as="h1" intent="title">
            Data Apps
          </Text>
          <Text as="p">
            Create apps with the Vana Data Protocol.&nbsp;
            <LearnMoreLink className="text-foreground-dim">
              Learn more
            </LearnMoreLink>
            .
          </Text>
        </div>

        <section className="container max-w-wide-width">
          <div className="grid gap-w4 md:grid-cols-2 xl:grid-cols-3">
            {apps.map(app => (
              <AppCard key={app.id} app={app} />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
