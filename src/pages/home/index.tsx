import { useEffect, useMemo, useState } from "react"
import { MotionConfig } from "motion/react"
import { useNavigate } from "react-router-dom"
import { useSelector } from "react-redux"
import { usePlatforms } from "@/hooks/usePlatforms"
import { useConnector } from "@/hooks/useConnector"
import { useConnectorUpdates } from "@/hooks/useConnectorUpdates"
import type { Platform, RootState } from "@/types"
import { SlidingTabs } from "@/components/elements/sliding-tabs"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { ConnectedAppsList } from "@/pages/home/components/connected-apps-list"
import { ConnectedSourcesList } from "@/pages/home/components/connected-sources-list"
import { AvailableSourcesList } from "@/pages/home/components/available-sources-list"
import { ConnectorUpdates } from "@/pages/home/components/connector-updates"
import {
  USE_TEST_DATA,
  testConnectedApps,
  testConnectedPlatforms,
  testPlatforms,
} from "./fixtures"

export function Home() {
  const navigate = useNavigate()
  const { platforms, isPlatformConnected, loadPlatforms } = usePlatforms()
  const { startExport } = useConnector()
  const { checkForUpdates } = useConnectorUpdates()
  const runs = useSelector((state: RootState) => state.app.runs)
  const connectedApps = useSelector((state: RootState) => state.app.connectedApps)
  const [activeTab, setActiveTab] = useState("sources")
  const [enableTabMotion, setEnableTabMotion] = useState(false)

  const tabs = [
    { value: "sources", label: "Your data" },
    { value: "apps", label: "Connected apps" },
  ]

  const displayPlatforms =
    platforms.length > 0 ? platforms : USE_TEST_DATA ? testPlatforms : []
  const displayConnectedApps =
    connectedApps.length > 0 ? connectedApps : USE_TEST_DATA ? testConnectedApps : []

  // Derived state: recently completed platform IDs (memoized, not effect-stored)
  useEffect(() => {
    checkForUpdates()
  }, [checkForUpdates])

  useEffect(() => {
    const frame = requestAnimationFrame(() => setEnableTabMotion(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  const handleExport = async (platform: Platform) => {
    console.log(
      "Starting export for platform:",
      platform.id,
      platform.name,
      "runtime:",
      platform.runtime
    )
    try {
      await startExport(platform)
      // No navigation - stay on this page
    } catch (error) {
      console.error("Export failed:", error)
    }
  }

  // Separate available platforms (memoized to avoid re-filtering on every render)
  const connectedPlatformsList = useMemo(() => {
    if (USE_TEST_DATA && platforms.length === 0) {
      return testConnectedPlatforms
    }
    return displayPlatforms.filter(p => isPlatformConnected(p.id))
  }, [displayPlatforms, isPlatformConnected, platforms.length])

  const availablePlatforms = useMemo(() => {
    if (USE_TEST_DATA && platforms.length === 0) {
      return testPlatforms
    }
    return displayPlatforms
  }, [displayPlatforms, platforms.length])

  return (
    <div className="container py-w16">
      {/* Connector Updates - show when browser is ready */}
      <ConnectorUpdates onReloadPlatforms={loadPlatforms} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <MotionConfig reducedMotion={enableTabMotion ? "never" : "always"}>
          <SlidingTabs
            className="mb-w12"
            tabs={tabs}
            value={activeTab}
            onValueChange={setActiveTab}
          />
        </MotionConfig>

        {/* Sources Tab */}
        <TabsContent value="sources" className="space-y-w12">
          <ConnectedSourcesList
            platforms={connectedPlatformsList}
            runs={runs}
            onOpenRuns={() => navigate("/runs")}
          />
          <AvailableSourcesList
            platforms={availablePlatforms}
            onExport={handleExport}
          />
        </TabsContent>

        {/* Connected Apps Tab */}
        <TabsContent value="apps">
          <ConnectedAppsList apps={displayConnectedApps} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
