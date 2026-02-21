import { Text } from "@/components/typography/text"
import { KeyRoundIcon } from "lucide-react"
import { PlatformIcon } from "@/components/icons/platform-icon"
import { DEV_FLAGS } from "@/config/dev-flags"
import type { BrowserSession } from "../types"
import { SettingsConfirmAction } from "./settings-confirm-action"
import { SettingsCard, SettingsCardStack } from "./settings-shared"
import { SettingsRow } from "./settings-row"

interface SettingsCredentialsProps {
  sessions: BrowserSession[]
  onClearSession: (connectorId: string) => void
}

const TEST_CREDENTIALS_UI_STATE: "real" | "populated" =
  DEV_FLAGS.useSettingsUiMocks ? "populated" : "real"
const TEST_BROWSER_SESSIONS: BrowserSession[] = [
  {
    connectorId: "chatgpt-playwright",
    path: "/tmp/chatgpt/session.json",
    sizeBytes: 186_212,
    lastModified: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    connectorId: "spotify-playwright",
    path: "/tmp/spotify/session.json",
    sizeBytes: 92_408,
    lastModified: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
  },
]

const CONNECTOR_DISPLAY_NAMES: Record<string, string> = {
  "chatgpt-playwright": "ChatGPT",
}

function getDisplayName(connectorId: string): string {
  return (
    CONNECTOR_DISPLAY_NAMES[connectorId] ??
    connectorId
      .replace(/-playwright$/, "")
      .replace(/-/g, " ")
      .replace(/\b\w/g, c => c.toUpperCase())
  )
}

function getPlatformIconName(connectorId: string): string {
  return connectorId.replace(/-playwright$/, "")
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  if (!iso) return "Unknown"
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  } catch {
    return "Unknown"
  }
}

export function SettingsCredentials({
  sessions,
  onClearSession,
}: SettingsCredentialsProps) {
  const effectiveSessions =
    TEST_CREDENTIALS_UI_STATE === "populated" ? TEST_BROWSER_SESSIONS : sessions

  return (
    <div className="space-y-8">
      {effectiveSessions.length === 0 ? (
        <>
          <SettingsCardStack>
            <SettingsCard>
              <SettingsRow
                icon={<KeyRoundIcon aria-hidden="true" className="size-6!" />}
                title={"No stored sessions"}
              />
            </SettingsCard>
          </SettingsCardStack>
          <Text as="p" intent="small" muted>
            When you log in to a platform through a connector, your browser
            session is stored here so you don't have to log in again next time.
          </Text>
        </>
      ) : (
        <SettingsCardStack>
          <SettingsCard divided>
            {effectiveSessions.map(session => (
              <SettingsRow
                key={session.connectorId}
                wrapIcon={false}
                icon={
                  <PlatformIcon
                    iconName={getPlatformIconName(session.connectorId)}
                    fallbackLabel={getDisplayName(session.connectorId)}
                    size={24}
                  />
                }
                title={getDisplayName(session.connectorId)}
                description={`Session stored · ${formatBytes(session.sizeBytes)} · Last used ${formatDate(session.lastModified)}`}
                right={
                  <SettingsConfirmAction
                    triggerLabel="Clear"
                    title="Clear stored session?"
                    description={
                      <>
                        This removes your saved login for{" "}
                        <strong>{getDisplayName(session.connectorId)}</strong>.
                        You will need to sign in again next time you import.
                      </>
                    }
                    actionLabel="Clear"
                    onAction={() => onClearSession(session.connectorId)}
                    media={
                      <PlatformIcon
                        iconName={getPlatformIconName(session.connectorId)}
                        fallbackLabel={getDisplayName(session.connectorId)}
                        size={24}
                      />
                    }
                  />
                }
              />
            ))}
          </SettingsCard>
        </SettingsCardStack>
      )}
    </div>
  )
}
