import { ArrowUpRightIcon, BoxIcon, Trash2Icon } from "lucide-react"
import type { ConnectedApp } from "@/types"
import { PlatformIcon } from "@/components/icons/platform-icon"
import { OpenExternalLink } from "@/components/typography/link-open-external"
import { Text } from "@/components/typography/text"
import { DEV_FLAGS } from "@/config/dev-flags"
import { LINKS } from "@/config/links"
import { SettingsConfirmAction } from "./settings-confirm-action"
import { SettingsCard, SettingsCardStack } from "./settings-shared"
import { SettingsRow } from "./settings-row"

// Settings surface for Connected apps.
// This is a permission management surface: it shows granted scopes and supports revoke actions.
// It is intentionally different from Home's quick-launch/activity list.

const TEST_APPS_UI_STATE: "real" | "populated" = DEV_FLAGS.useSettingsUiMocks
  ? "populated"
  : "real"
const TEST_CONNECTED_APPS: ConnectedApp[] = [
  {
    id: "test-app-even-stevens",
    name: "Even Stevens",
    permissions: ["Read", "Write"],
    connectedAt: new Date().toISOString(),
  },
  {
    id: "test-app-rickroll",
    name: "RickRoll",
    permissions: ["Read", "Receive Realtime Updates"],
    connectedAt: new Date().toISOString(),
  },
]

interface SettingsAppsProps {
  connectedApps: ConnectedApp[]
  onRevokeApp: (appId: string) => void
}

export function SettingsApps({
  connectedApps,
  onRevokeApp,
}: SettingsAppsProps) {
  const effectiveConnectedApps =
    TEST_APPS_UI_STATE === "populated" ? TEST_CONNECTED_APPS : connectedApps

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
          className="inline-flex text-current hover:text-foreground"
          href={LINKS.appDevelopmentDocs}
          withIcon
        >
          docs
          <ArrowUpRightIcon aria-hidden="true" />
        </OpenExternalLink>
      </Text>
    </div>
  )
}
