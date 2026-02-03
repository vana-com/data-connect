import { useYourDataPage } from "./use-your-data-page"
import { YourDataHeader } from "./components/your-data-header"
import { YourDataTabs } from "./components/your-data-tabs"
import { ConnectedSourcesSection } from "./components/connected-sources-section"
import { AvailableSourcesSection } from "./components/available-sources-section"
import { ConnectedAppsSection } from "./components/connected-apps-section"

export function YourData() {
  const {
    activeTab,
    setActiveTab,
    connectedSources,
    availableSources,
    handleConnectSource,
    handleViewRuns,
  } = useYourDataPage()

  return (
    <div className="container py-w16">
      <div className="space-y-w12">
        <YourDataHeader />

        <YourDataTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === "sources" && (
          <div className="space-y-w12">
            <ConnectedSourcesSection
              connectedSources={connectedSources}
              onViewRuns={handleViewRuns}
            />
            <AvailableSourcesSection
              availableSources={availableSources}
              hasConnectedSources={connectedSources.length > 0}
              onConnect={handleConnectSource}
            />
          </div>
        )}

        {activeTab === "apps" && <ConnectedAppsSection />}
      </div>
    </div>
  )
}
