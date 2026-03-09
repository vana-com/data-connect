import { getAppRegistryEntries } from "@/apps/registry"
import { PageContainer } from "@/components/elements/page-container"
import { SlidingTabs } from "@/components/elements/sliding-tabs"
import { LearnMoreLink } from "@/components/typography/link-learn-more"
import { Text } from "@/components/typography/text"
import { LINKS } from "@/config/links"
import { MotionConfig } from "motion/react"
import { ArrowUpRightIcon } from "lucide-react"
import { ConnectedAppsList } from "./components/connected-apps-list"
import { RegistryAppCard } from "./components/registry-app-card"
import { cn } from "@/lib/utils"
import { useDataAppsPage } from "./use-data-apps-page"

export function DataApps() {
  const apps = getAppRegistryEntries()
  const {
    activeTab,
    canOpenConnectedApp,
    connectedApps,
    connectedAppsUiDebugEnabled,
    currentConnectedAppsUiDebugScenario,
    enableTabMotion,
    isConnectedAppsLoading,
    openConnectedApp,
    setActiveTab,
    setConnectedAppsUiDebugScenario,
  } = useDataAppsPage()
  const tabs = [
    { value: "discover", label: "Discover Apps" },
    { value: "connected", label: "Connected Apps" },
  ] as const
  const handleTabChange = (value: string) => {
    setActiveTab(value === "connected" ? "connected" : "discover")
  }

  return (
    <PageContainer>
      <Text as="h1" intent="subtitle" weight="medium" className="sr-only">
        Data Apps
      </Text>
      <MotionConfig reducedMotion={enableTabMotion ? "never" : "always"}>
        <SlidingTabs
          tabs={tabs.map(tab => ({ ...tab }))}
          value={activeTab}
          onValueChange={handleTabChange}
          ariaLabel="Data apps sections"
        />
      </MotionConfig>

      {activeTab === "discover" ? (
        <section className="pt-w8">
          <div className="pb-w8">
            <Text as="p" intent="small" muted>
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
        </section>
      ) : (
        <section className="pt-w8">
          <ConnectedAppsList
            apps={connectedApps}
            canOpenApp={canOpenConnectedApp}
            connectedAppsUiDebugEnabled={connectedAppsUiDebugEnabled}
            currentConnectedAppsUiDebugScenario={
              currentConnectedAppsUiDebugScenario
            }
            isLoading={isConnectedAppsLoading}
            onOpenApp={openConnectedApp}
            onSetConnectedAppsUiDebugScenario={setConnectedAppsUiDebugScenario}
          />
        </section>
      )}
    </PageContainer>
  )
}
