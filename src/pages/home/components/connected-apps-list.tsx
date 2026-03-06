import { useCallback, useMemo } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import {
  openSubmittedAppExternalUrl,
  parseSubmittedAppExternalUrl,
} from "@/apps/external-url"
import {
  SourceRowActionButton,
  SourceRowWithActions,
} from "@/components/elements/source-row"
import { ActionPanel } from "@/components/typography/button-action"
import { DebugTogglePanel } from "@/components/elements/debug-toggle-panel"
import { Text } from "@/components/typography/text"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { buildSettingsUrl } from "@/pages/settings/url"
import { getAppRegistryEntry } from "@/apps/registry"
import type { ConnectedApp } from "@/types"
import { Button } from "@/components/ui/button"
import { ArrowUpRightIcon, SettingsIcon } from "lucide-react"
import {
  CONNECTED_APPS_UI_DEBUG_SCENARIO_VALUES,
  isConnectedAppsUiDebugEnabled,
  resolveConnectedAppsUiDebugExternalUrl,
  resolveConnectedAppsUiDebugApps,
} from "@/pages/home/connected-apps-ui-debug"

// Home surface for Connected apps.
// This is a quick-launch/activity surface: it shows recency and open/manage shortcuts.
// It is intentionally different from Settings' permission management list.

interface ConnectedAppsListProps {
  apps: ConnectedApp[]
}

function formatConnectedAt(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "Unknown"
  }
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  })
}

function getConnectedAppUrl(app: ConnectedApp, search: string) {
  const debugUrl = resolveConnectedAppsUiDebugExternalUrl({
    appId: app.id,
    search,
  })
  if (debugUrl) return new URL(debugUrl, window.location.origin)

  const entry = getAppRegistryEntry(app.id)
  return entry?.status === "live"
    ? parseSubmittedAppExternalUrl(entry.externalUrl)
    : null
}

const Header = () => {
  return (
    <Text as="p" intent="small" muted balance>
      Connected apps have your permission to access imported data on your
      Personal Server. Manage access{" "}
      <Link
        to={buildSettingsUrl({ section: "apps" })}
        className="link hover:text-foreground"
      >
        here
      </Link>
      .
    </Text>
  )
}

export function ConnectedAppsList({ apps }: ConnectedAppsListProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const currentConnectedAppsUiDebugScenario = useMemo(
    () => new URLSearchParams(location.search).get("connectedAppsScenario"),
    [location.search]
  )
  const connectedAppsUiDebugEnabled = useMemo(
    () => isConnectedAppsUiDebugEnabled(location.search),
    [location.search]
  )
  const effectiveApps = useMemo(
    () =>
      resolveConnectedAppsUiDebugApps({
        apps,
        search: location.search,
      }),
    [apps, location.search]
  )
  const setConnectedAppsUiDebugScenario = useCallback(
    (scenario: string | null) => {
      const nextParams = new URLSearchParams(location.search)
      if (scenario) nextParams.set("connectedAppsScenario", scenario)
      else nextParams.delete("connectedAppsScenario")
      navigate({ search: `?${nextParams.toString()}` }, { replace: true })
    },
    [location.search, navigate]
  )
  const debugPanel = import.meta.env.DEV ? (
    <DebugTogglePanel title="Connected apps debug">
      <div className="flex flex-wrap gap-2">
        {CONNECTED_APPS_UI_DEBUG_SCENARIO_VALUES.map(scenario => (
          <Button
            key={scenario}
            size="xs"
            variant={
              currentConnectedAppsUiDebugScenario === scenario
                ? "default"
                : "outline"
            }
            onClick={() => setConnectedAppsUiDebugScenario(scenario)}
          >
            {scenario}
          </Button>
        ))}
        <Button
          size="xs"
          variant={connectedAppsUiDebugEnabled ? "outline" : "default"}
          onClick={() => setConnectedAppsUiDebugScenario(null)}
        >
          real
        </Button>
      </div>
    </DebugTogglePanel>
  ) : null

  if (effectiveApps.length === 0) {
    return (
      <section data-component="connected-apps-list" className="space-y-gap">
        <Header />
        <div className="action-outset">
          <ActionPanel>
            <Text weight="medium">No connected apps yet</Text>
          </ActionPanel>
        </div>
        {debugPanel}
      </section>
    )
  }

  return (
    <section data-component="connected-apps-list" className="space-y-gap">
      <Header />
      <div className="flex flex-col gap-3 action-outset">
        {effectiveApps.map(app => {
          const appUrl = getConnectedAppUrl(app, location.search)
          const handleOpenApp = appUrl
            ? () => {
                void openSubmittedAppExternalUrl(appUrl)
              }
            : undefined

          return (
            <SourceRowWithActions
              key={app.id}
              iconName={app.icon?.trim() || app.name}
              fallbackLabel={app.name.charAt(0).toUpperCase()}
              label={app.name}
              meta={formatConnectedAt(app.connectedAt)}
              rowAction={{
                onClick: handleOpenApp,
                disabled: !handleOpenApp,
                ariaLabel: `Open ${app.name}`,
              }}
              middleSlot={
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SourceRowActionButton
                      className="pl-4 pr-3.5"
                      onClick={() =>
                        navigate(buildSettingsUrl({ section: "apps" }))
                      }
                      aria-label="Connected apps settings"
                    >
                      <SettingsIcon aria-hidden />
                    </SourceRowActionButton>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    View connected app settings
                  </TooltipContent>
                </Tooltip>
              }
              endSlotClassName="[&_svg:not([class*='size-']):not([data-slot=spinner])]:size-6!"
              endSlot={
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex h-full w-full items-center justify-center">
                      <ArrowUpRightIcon aria-hidden />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">Open app</TooltipContent>
                </Tooltip>
              }
            />
          )
        })}
      </div>
      {debugPanel}
    </section>
  )
}
