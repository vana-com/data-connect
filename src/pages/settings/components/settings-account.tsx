import { MonitorIcon } from "lucide-react"
import type { AuthUser } from "@/types"
import { Text } from "@/components/typography/text"
import { Button } from "@/components/ui/button"
import {
  SettingsCard,
  SettingsCardStack,
  SettingsRow,
  SettingsSection,
} from "./settings-shared"
import { VanaV } from "@/components/icons/vana-v"

// Local UI test toggle: set true to force logged-in state.
const TEST_LOGGED_IN = false
const TEST_ACCOUNT_EMAIL = "test.user@vana.xyz"

// Temporarily hide Sessions in Account tab without deleting implementation.
const SHOW_ACCOUNT_SESSIONS = false

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
  const effectiveIsAuthenticated = TEST_LOGGED_IN || isAuthenticated
  const effectiveAccountEmail = TEST_LOGGED_IN
    ? TEST_ACCOUNT_EMAIL
    : user?.email
  const currentSessionLabel = "Vana Desktop on macOS"
  const currentSessionLocation = "Brisbane, AU"
  const otherSessionLabel = "Vana iOS"
  const otherSessionLastSeen = "Brisbane, AU  Last seen about 4 hours ago"
  const handlePassportSignIn = () => {
    onSignIn()
  }

  return (
    <div className="space-y-8">
      {SHOW_ACCOUNT_SESSIONS && (
        <SettingsSection
          title="Sessions"
          description="Devices logged into your account."
        >
          <SettingsCardStack>
            <SettingsCard>
              <SettingsRow
                icon={<MonitorIcon aria-hidden="true" />}
                title={
                  <Text as="div" intent="body" weight="semi">
                    {effectiveIsAuthenticated
                      ? currentSessionLabel
                      : "Not signed in"}
                  </Text>
                }
                description={
                  effectiveIsAuthenticated ? (
                    <div className="flex items-center gap-1.5">
                      <span className="size-[0.5em] rounded-full bg-success-foreground" />
                      <Text
                        as="span"
                        intent="small"
                        color="success"
                        weight="medium"
                      >
                        Current session
                      </Text>
                      <Text as="span" intent="small" muted>
                        {currentSessionLocation}
                      </Text>
                    </div>
                  ) : (
                    <Text as="div" intent="small" muted>
                      Sign in to view and manage active sessions.
                    </Text>
                  )
                }
                right={
                  effectiveIsAuthenticated ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={TEST_LOGGED_IN ? undefined : onLogout}
                    >
                      Log out
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={
                        TEST_LOGGED_IN ? undefined : handlePassportSignIn
                      }
                    >
                      Sign in
                    </Button>
                  )
                }
              />
            </SettingsCard>

            {effectiveIsAuthenticated && (
              <SettingsCard>
                {/* SettingsMetaRow component? */}
                <div className="flex items-center justify-between px-4 py-3">
                  <Text as="div" intent="body" weight="normal">
                    1 other session
                  </Text>
                  <Button type="button" variant="ghost" size="sm">
                    Revoke All
                  </Button>
                </div>
                <div className="border-t border-border">
                  <SettingsRow
                    icon={<MonitorIcon aria-hidden="true" />}
                    title={
                      <Text as="div" intent="body" weight="semi">
                        {otherSessionLabel}
                      </Text>
                    }
                    description={
                      <Text as="div" intent="small" muted>
                        {otherSessionLastSeen}
                      </Text>
                    }
                  />
                </div>
              </SettingsCard>
            )}
          </SettingsCardStack>
        </SettingsSection>
      )}

      <SettingsSection
        title="Vana Passport Account"
        description="Securely share your data with apps you approve."
      >
        <SettingsCardStack>
          <SettingsCard>
            <SettingsRow
              icon={
                <div className="p-1">
                  <div className="border border-current p-0.75 rounded-soft">
                    <VanaV aria-hidden="true" className="size-[18px]!" />
                  </div>
                </div>
              }
              title={
                <Text as="div" weight="semi">
                  {effectiveAccountEmail || "Not signed in"}
                </Text>
              }
              right={
                effectiveIsAuthenticated ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={TEST_LOGGED_IN ? undefined : onLogout}
                  >
                    Sign out
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={TEST_LOGGED_IN ? undefined : handlePassportSignIn}
                  >
                    Sign in
                  </Button>
                )
              }
            />
          </SettingsCard>
        </SettingsCardStack>
      </SettingsSection>
    </div>
  )
}
