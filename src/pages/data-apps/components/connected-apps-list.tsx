import { Link } from "react-router-dom"
import {
  SourceRowList,
  SourceRowWithActions,
  sourceRowActionInteractiveClass,
} from "@/components/elements/source-row"
import { Spinner } from "@/components/elements/spinner"
import { DebugTogglePanel } from "@/components/elements/debug-toggle-panel"
import { ActionPanel } from "@/components/typography/button-action"
import { Text } from "@/components/typography/text"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { buildSettingsUrl } from "@/pages/settings/url"
import type { ConnectedApp } from "@/types"
import { ArrowUpRightIcon, SettingsIcon } from "lucide-react"
import { CONNECTED_APPS_UI_DEBUG_SCENARIO_VALUES } from "../connected-apps-ui-debug"

interface ConnectedAppsListProps {
  apps: ConnectedApp[]
  canOpenApp: (app: ConnectedApp) => boolean
  connectedAppsUiDebugEnabled: boolean
  currentConnectedAppsUiDebugScenario: string | null
  isLoading: boolean
  onOpenApp: (app: ConnectedApp) => void
  onSetConnectedAppsUiDebugScenario: (scenario: string | null) => void
}

function Header() {
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

export function ConnectedAppsList({
  apps,
  canOpenApp,
  connectedAppsUiDebugEnabled,
  currentConnectedAppsUiDebugScenario,
  isLoading,
  onOpenApp,
  onSetConnectedAppsUiDebugScenario,
}: ConnectedAppsListProps) {
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
            onClick={() => onSetConnectedAppsUiDebugScenario(scenario)}
          >
            {scenario}
          </Button>
        ))}
        <Button
          size="xs"
          variant={connectedAppsUiDebugEnabled ? "outline" : "default"}
          onClick={() => onSetConnectedAppsUiDebugScenario(null)}
        >
          real
        </Button>
      </div>
    </DebugTogglePanel>
  ) : null

  if (isLoading) {
    return (
      <section data-component="connected-apps-list" className="space-y-w8">
        <Header />
        <div className="action-outset">
          <ActionPanel className="justify-start">
            <Text weight="medium" withIcon>
              <Spinner />
              Loading…
            </Text>
          </ActionPanel>
        </div>
        {debugPanel}
      </section>
    )
  }

  if (apps.length === 0) {
    return (
      <section data-component="connected-apps-list" className="space-y-w8">
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
    <section data-component="connected-apps-list" className="space-y-w8">
      <Header />
      <SourceRowList>
        {apps.map(app => {
          const appCanOpen = canOpenApp(app)
          const handleOpenApp = appCanOpen ? () => onOpenApp(app) : undefined

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
                    <Link
                      to={buildSettingsUrl({ section: "apps" })}
                      className={`${sourceRowActionInteractiveClass} pl-4 pr-3.5`}
                      aria-label="Connected apps settings"
                    >
                      <SettingsIcon aria-hidden />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="top">View settings</TooltipContent>
                </Tooltip>
              }
              endSlotClassName="[&_svg:not([class*='size-']):not([data-slot=spinner])]:size-6!"
              surface="list-item"
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
      </SourceRowList>
      {debugPanel}
    </section>
  )
}
