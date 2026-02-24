import { ArrowUpRightIcon, BoxIcon } from "lucide-react"
import { useCallback } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import type { ConnectedApp } from "@/types"
import { PlatformIcon } from "@/components/icons/platform-icon"
import { DebugTogglePanel } from "@/components/elements/debug-toggle-panel"
import { OpenExternalLink } from "@/components/typography/link-open-external"
import { Text } from "@/components/typography/text"
import { LINKS } from "@/config/links"
import { Button } from "@/components/ui/button"
import {
  SETTINGS_APPS_UI_DEBUG_SCENARIO_VALUES,
  isSettingsAppsUiDebugEnabled,
  resolveSettingsAppsUiDebugApps,
} from "./settings-apps-ui-debug"
import { SettingsConfirmAction } from "./settings-confirm-action"
import { SettingsCard, SettingsCardStack } from "./settings-shared"
import { SettingsRow } from "./settings-row"

// Settings surface for Connected apps.
// This is a permission management surface: it shows granted scopes and supports revoke actions.
// It is intentionally different from Home's quick-launch/activity list.

interface SettingsAppsProps {
  connectedApps: ConnectedApp[]
  onRevokeApp: (appId: string) => void
}

export function SettingsApps({
  connectedApps,
  onRevokeApp,
}: SettingsAppsProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const effectiveConnectedApps = resolveSettingsAppsUiDebugApps({
    connectedApps,
    search: location.search,
  })
  const setSettingsAppsDebugScenario = useCallback(
    (scenario: string | null) => {
      const nextParams = new URLSearchParams(location.search)
      if (scenario) nextParams.set("settingsAppsScenario", scenario)
      else nextParams.delete("settingsAppsScenario")
      navigate({ search: `?${nextParams.toString()}` }, { replace: true })
    },
    [location.search, navigate]
  )

  return (
    <div className="space-y-8">
      <SettingsCardStack>
        {effectiveConnectedApps.length === 0 ? (
          <SettingsCard>
            <SettingsRow
              icon={<BoxIcon aria-hidden="true" className="size-6!" />}
              title={"No connected apps"}
            />
          </SettingsCard>
        ) : (
          <SettingsCard divided>
            {effectiveConnectedApps.map(app => (
              <SettingsRow
                key={app.id}
                wrapIcon={false}
                icon={
                  <PlatformIcon
                    iconName={app.icon?.trim() || app.name}
                    fallbackLabel={app.name.charAt(0).toUpperCase()}
                    size={28}
                  />
                }
                title={app.name}
                description={
                  app.permissions.length > 0
                    ? app.permissions.join(", ")
                    : "Full access"
                }
                right={
                  <SettingsConfirmAction
                    triggerLabel="Revoke"
                    title="Revoke app access?"
                    description={
                      <>
                        This will remove access for <strong>{app.name}</strong>.
                        You can reconnect it later if needed.
                      </>
                    }
                    actionLabel="Revoke"
                    onAction={() => onRevokeApp(app.id)}
                    media={
                      <PlatformIcon
                        iconName={app.icon?.trim() || app.name}
                        fallbackLabel={app.name.charAt(0).toUpperCase()}
                        size={24}
                      />
                    }
                  />
                }
              />
            ))}
          </SettingsCard>
        )}
      </SettingsCardStack>
      <Text as="p" intent="small" muted>
        Want to build your own application? Check our{" "}
        <OpenExternalLink
          intent="small"
          href={LINKS.appBuilderDocs}
          withIcon
        >
          docs
          <ArrowUpRightIcon aria-hidden="true" />
        </OpenExternalLink>
      </Text>
      {import.meta.env.DEV ? (
        <DebugTogglePanel title="Settings apps debug">
          <div className="flex flex-wrap gap-2">
            {SETTINGS_APPS_UI_DEBUG_SCENARIO_VALUES.map(scenario => (
              <Button
                key={scenario}
                type="button"
                size="xs"
                variant={
                  new URLSearchParams(location.search).get(
                    "settingsAppsScenario"
                  ) === scenario
                    ? "default"
                    : "outline"
                }
                onClick={() => setSettingsAppsDebugScenario(scenario)}
              >
                {scenario}
              </Button>
            ))}
            <Button
              type="button"
              size="xs"
              variant={isSettingsAppsUiDebugEnabled(location.search) ? "outline" : "default"}
              onClick={() => setSettingsAppsDebugScenario(null)}
            >
              real
            </Button>
          </div>
        </DebugTogglePanel>
      ) : null}
    </div>
  )
}
