import { useCallback, useEffect, useMemo, useState } from "react"
import { MotionConfig } from "motion/react"
import { useNavigate } from "react-router-dom"
import { useSelector } from "react-redux"
import { usePlatforms } from "@/hooks/usePlatforms"
import { useConnector } from "@/hooks/useConnector"
import { useConnectorUpdates } from "@/hooks/useConnectorUpdates"
import { useConnectedApps } from "@/hooks/useConnectedApps"
import { usePersonalServer } from "@/hooks/usePersonalServer"
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
import { buildSettingsUrl } from "@/pages/settings/url"
import {
  buildGrantSearchParams,
  getGrantParamsFromSearchParams,
} from "@/lib/grant-params"
import { getPlatformRegistryEntry } from "@/lib/platform/utils"
import { DEV_FLAGS } from "@/config/dev-flags"
import { testConnectedApps, testConnectedPlatforms, testPlatforms } from "./fixtures"

export function Home() {
  const navigate = useNavigate()
  const { platforms, isPlatformConnected, loadPlatforms } = usePlatforms()
  const { startImport } = useConnector()
  const { checkForUpdates } = useConnectorUpdates()
  const { connectedApps, fetchConnectedApps } = useConnectedApps()
  const personalServer = usePersonalServer()
  const runs = useSelector((state: RootState) => state.app.runs)
  const [activeTab, setActiveTab] = useState("sources")
  const [enableTabMotion, setEnableTabMotion] = useState(false)
  const [deepLinkInput, setDeepLinkInput] = useState("")

  const tabs = [
    { value: "sources", label: "Your data" },
    { value: "apps", label: "Connected apps" },
  ]

  const displayPlatforms =
    platforms.length > 0 ? platforms : DEV_FLAGS.useHomeTestFixtures ? testPlatforms : []
  const displayConnectedApps =
    connectedApps.length > 0
      ? connectedApps
      : DEV_FLAGS.useHomeTestFixtures
        ? testConnectedApps
        : []

  // Fetch connected apps from Personal Server when it becomes available
  useEffect(() => {
    if (personalServer.port && personalServer.status === "running") {
      fetchConnectedApps(personalServer.port, personalServer.devToken)
    }
  }, [
    personalServer.port,
    personalServer.status,
    personalServer.devToken,
    fetchConnectedApps,
  ])

  // Derived state: recently completed platform IDs (memoized, not effect-stored)
  useEffect(() => {
    checkForUpdates()
  }, [checkForUpdates])

  useEffect(() => {
    const frame = requestAnimationFrame(() => setEnableTabMotion(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  const handleImportSource = useCallback(
    async (platform: Platform) => {
      console.log(
        "Starting import for platform:",
        platform.id,
        platform.name,
        "runtime:",
        platform.runtime
      )
      try {
        await startImport(platform)
        navigate(buildSettingsUrl({ section: "imports", source: platform.id }))
      } catch (error) {
        console.error("Import failed:", error)
      }
    },
    [navigate, startImport]
  )

  const handleTestDeepLink = useCallback(() => {
    const trimmed = deepLinkInput.trim()
    if (!trimmed) return
    try {
      const parsed = new URL(trimmed)
      const params = getGrantParamsFromSearchParams(parsed.searchParams)
      if (!params.sessionId && !params.appId) return
      const qs = buildGrantSearchParams(params).toString()
      const route = params.status === "success" ? ROUTES.grant : ROUTES.connect
      navigate(`${route}${qs ? `?${qs}` : ""}`)
    } catch {
      // invalid URL — ignore
    }
  }, [deepLinkInput, navigate])

  // Separate available platforms (memoized to avoid re-filtering on every render)
  const connectedPlatformsList = useMemo(() => {
    if (DEV_FLAGS.useHomeTestFixtures && platforms.length === 0) {
      return testConnectedPlatforms
    }
    return displayPlatforms.filter(p => isPlatformConnected(p.id))
  }, [displayPlatforms, isPlatformConnected, platforms.length])

  const availablePlatforms = useMemo(() => {
    if (DEV_FLAGS.useHomeTestFixtures && platforms.length === 0) {
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
            headline="Your connected data"
            onOpenRuns={platform =>
              navigate(
                ROUTES.source.replace(
                  ":platformId",
                  getPlatformRegistryEntry(platform)?.id ?? platform.id
                )
              )
            }
          />
          <AvailableSourcesList
            platforms={availablePlatforms}
            runs={runs}
            headline="Available connectors"
            onExport={handleImportSource}
            connectedPlatformIds={connectedPlatformsList.map(p => p.id)}
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
            <form
              className="mt-3 flex flex-col gap-2"
              onSubmit={e => {
                e.preventDefault()
                handleTestDeepLink()
              }}
            >
              <input
                type="text"
                value={deepLinkInput}
                onChange={e => setDeepLinkInput(e.target.value)}
                placeholder="vana://connect?sessionId=...&secret=..."
                className="rounded border px-2 py-1 text-xs"
              />
              <Button type="submit" size="xs" variant="outline">
                Test deep link
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
