import { ShieldIcon, Trash2Icon } from "lucide-react"
import type { ConnectedApp } from "../../../types"
import { Text } from "@/components/typography/text"
import { Button } from "@/components/ui/button"
import { SettingsCard, SettingsRow, SettingsSection } from "./settings-shared"

interface SettingsAppsProps {
  connectedApps: ConnectedApp[]
  onRevokeApp: (appId: string) => void
}

export function SettingsApps({ connectedApps, onRevokeApp }: SettingsAppsProps) {
  return (
    <div>
      <SettingsSection title="Connected applications">
        {connectedApps.length === 0 ? (
          <SettingsCard contentClassName="p-12 text-center">
            <ShieldIcon
              aria-hidden="true"
              className="mx-auto size-12 text-muted-foreground"
            />
            <Text as="h3" intent="heading" weight="semi" className="mt-4">
              No connected apps
            </Text>
            <Text as="p" intent="small" color="mutedForeground" className="mt-2">
              Apps that you authorise to access your data will appear here
            </Text>
          </SettingsCard>
        ) : (
          <SettingsCard divided>
            {connectedApps.map(app => (
              <SettingsRow
                key={app.id}
                iconContainerClassName="bg-muted"
                icon={
                  <Text as="span" intent="subtitle" inline>
                    {app.icon || "🔗"}
                  </Text>
                }
                title={
                  <Text as="div" intent="small" weight="medium">
                    {app.name}
                  </Text>
                }
                description={
                  <Text as="div" intent="fine" color="mutedForeground">
                    {app.permissions.length > 0
                      ? app.permissions.join(", ")
                      : "Full access"}
                  </Text>
                }
                right={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-destructive/30 text-destructive hover:bg-destructive/10"
                    onClick={() => onRevokeApp(app.id)}
                  >
                    <Trash2Icon aria-hidden="true" className="size-4" />
                    Revoke
                  </Button>
                }
              />
            ))}
          </SettingsCard>
        )}
      </SettingsSection>
    </div>
  )
}
