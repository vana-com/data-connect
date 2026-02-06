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
import { Text } from "@/components/typography/text"
import { Button } from "@/components/ui/button"
import { ROUTES } from "@/config/routes"
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
  const connectedApps = useSelector(
    (state: RootState) => state.app.connectedApps
  )
  const [activeTab, setActiveTab] = useState("sources")
  const [enableTabMotion, setEnableTabMotion] = useState(false)

  const tabs = [
    { value: "sources", label: "Your data" },
    { value: "apps", label: "Connected apps" },
  ]

  const displayPlatforms =
    platforms.length > 0 ? platforms : USE_TEST_DATA ? testPlatforms : []
  const displayConnectedApps =
    connectedApps.length > 0
      ? connectedApps
      : USE_TEST_DATA
        ? testConnectedApps
        : []

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
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-w12"
      >
        <MotionConfig reducedMotion={enableTabMotion ? "never" : "always"}>
          <SlidingTabs
            tabs={tabs}
            value={activeTab}
            onValueChange={setActiveTab}
          />
        </MotionConfig>

        {/* SOURCES */}
        <TabsContent value="sources" className="space-y-w12">
          <ConnectedSourcesList
            platforms={connectedPlatformsList}
            runs={runs}
            onOpenRuns={platform =>
              navigate(ROUTES.source.replace(":platformId", platform.id))
            }
          />
          <AvailableSourcesList
            platforms={availablePlatforms}
            runs={runs}
            onExport={handleExport}
          />
        </TabsContent>

        {/* APPS */}
        <TabsContent value="apps">
          <ConnectedAppsList apps={displayConnectedApps} />
        </TabsContent>
      </Tabs>

      {/* DEV ONLY SHORTCUT: RickRoll /connect link */}
      {import.meta.env.DEV && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="rounded-card bg-background p-3 shadow-md">
            <Text intent="small" weight="medium">
              Home debug
            </Text>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" size="xs" variant="outline" asChild>
                <a href="/connect?sessionId=grant-session-1770358735328&appId=rickroll&scopes=%5B%22read%3Achatgpt-conversations%22%5D">
                  Open Rickroll connect
                </a>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
