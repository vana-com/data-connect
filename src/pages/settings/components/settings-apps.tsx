import { BoxIcon, Trash2Icon } from "lucide-react"
import type { ConnectedApp } from "@/types"
import { PlatformIcon } from "@/components/icons/platform-icon"
import { OpenExternalLink } from "@/components/typography/link-open-external"
import { Text } from "@/components/typography/text"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { LINKS } from "@/config/links"
import { SettingsCard, SettingsCardStack, SettingsRow } from "./settings-shared"

// Local UI test toggle: set true to force test app rows.
const TEST_LOGGED_IN = false
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
  const effectiveConnectedApps = TEST_LOGGED_IN
    ? TEST_CONNECTED_APPS
    : connectedApps

  return (
    <div className="space-y-8">
      <SettingsCardStack>
        {effectiveConnectedApps.length === 0 ? (
          <SettingsCard>
            <SettingsRow
              icon={<BoxIcon aria-hidden="true" />}
              title={
                <Text as="div" intent="body" weight="semi">
                  No connected apps
                </Text>
              }
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
                title={
                  <Text as="div" intent="body" weight="semi">
                    {app.name}
                  </Text>
                }
                description={
                  <Text as="div" intent="small" muted>
                    {app.permissions.length > 0
                      ? app.permissions.join(", ")
                      : "Full access"}
                  </Text>
                }
                right={
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button type="button" variant="ghost" size="sm">
                        Revoke
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent size="sm">
                      <AlertDialogHeader>
                        <AlertDialogMedia>
                          <Trash2Icon aria-hidden="true" />
                        </AlertDialogMedia>
                        <AlertDialogTitle>Revoke app access?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove access for{" "}
                          <strong>{app.name}</strong>. You can reconnect it
                          later if needed.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel size="sm">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          size="sm"
                          variant="destructive"
                          onClick={() => onRevokeApp(app.id)}
                        >
                          Revoke
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                }
              />
            ))}
          </SettingsCard>
        )}
      </SettingsCardStack>
      <Text as="p" intent="small" muted>
        Want to build your own application? Check{" "}
        <OpenExternalLink
          intent="small"
          className="text-current hover:text-foreground"
          href={LINKS.appDevelopmentDocs}
        >
          {LINKS.appDevelopmentDocs.replace(/^https?:\/\//, "")}
        </OpenExternalLink>
        .
      </Text>
    </div>
  )
}
