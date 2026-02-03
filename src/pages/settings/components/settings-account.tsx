import {
  DatabaseIcon,
  MonitorIcon,
  ShieldIcon,
  LogOutIcon,
  LogInIcon,
} from "lucide-react"
import type { AuthUser } from "../../../types"
import { Text } from "@/components/typography/text"
import { Button } from "@/components/ui/button"
import { SettingsCard, SettingsRow, SettingsSection } from "./settings-shared"

interface SettingsAccountProps {
  user: AuthUser | null
  isAuthenticated: boolean
  onLogout: () => void
  onSignIn: () => void
}

export function SettingsAccount({
  user,
  isAuthenticated,
  onLogout,
  onSignIn,
}: SettingsAccountProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-card border border-accent/20 bg-accent/10 p-4">
        <div className="flex gap-3">
          <DatabaseIcon aria-hidden="true" className="size-5 text-accent" />
          <div className="space-y-1">
            <Text as="div" intent="small" weight="semi">
              Local-only storage enabled
            </Text>
            <Text as="div" intent="fine" color="accent">
              Your data never leaves this device unless you explicitly export it.
            </Text>
          </div>
        </div>
      </div>

      <SettingsSection title="Sessions">
        <SettingsCard>
          <SettingsRow
            iconContainerClassName="bg-success/10"
            icon={<MonitorIcon aria-hidden="true" className="size-5 text-success" />}
            title={
              <Text as="div" intent="small" weight="medium">
                Current device
              </Text>
            }
            description={
              <Text as="div" intent="fine" color="mutedForeground">
                This computer
              </Text>
            }
            right={
              <Text
                as="span"
                intent="pill"
                color="success"
                className="rounded-button bg-success/10 px-2 py-0.5"
              >
                Active
              </Text>
            }
          />
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title="Account">
        <SettingsCard>
          <SettingsRow
            iconContainerClassName="bg-muted"
            icon={
              <ShieldIcon aria-hidden="true" className="size-5 text-muted-foreground" />
            }
            title={
              <Text as="div" intent="small" weight="medium">
                Email
              </Text>
            }
            description={
              <Text as="div" intent="fine" color="mutedForeground">
                {user?.email || "Not signed in"}
              </Text>
            }
            right={
              !isAuthenticated && (
                <Button type="button" variant="outline" size="sm" onClick={onSignIn}>
                  <LogInIcon aria-hidden="true" className="size-4" />
                  Sign in
                </Button>
              )
            }
          />
          {isAuthenticated && (
            <div className="border-t border-border p-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-destructive/30 text-destructive hover:bg-destructive/10"
                onClick={onLogout}
              >
                <LogOutIcon aria-hidden="true" className="size-4" />
                Sign out
              </Button>
            </div>
          )}
        </SettingsCard>
      </SettingsSection>
    </div>
  )
}
