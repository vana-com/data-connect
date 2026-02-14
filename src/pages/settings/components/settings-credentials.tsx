import { Text } from "@/components/typography/text"
import { Button } from "@/components/ui/button"
import { KeyRoundIcon } from "lucide-react"
import { PlatformIcon } from "@/components/icons/platform-icon"
import type { BrowserSession } from "../types"
import { SettingsCard, SettingsCardStack, SettingsRow } from "./settings-shared"

interface SettingsCredentialsProps {
  sessions: BrowserSession[]
  onClearSession: (connectorId: string) => void
}

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
  return (
    <div className="space-y-8">
      {sessions.length === 0 ? (
        <>
          <SettingsCardStack>
            <SettingsCard>
              <SettingsRow
                icon={<KeyRoundIcon aria-hidden="true" />}
                title={
                  <Text as="div" intent="body" weight="semi">
                    No stored sessions
                  </Text>
                }
              />
            </SettingsCard>
          </SettingsCardStack>
          <Text as="p" intent="small" muted>
            When you log in to a platform through a connector, your browser
            session is stored here so you don't have to log in again next time.
          </Text>
        </>
      ) : (
        <SettingsCard divided>
          {sessions.map(session => (
            <SettingsRow
              key={session.connectorId}
              wrapIcon={false}
              icon={
                <PlatformIcon
                  iconName={getPlatformIconName(session.connectorId)}
                  fallbackLabel={getDisplayName(session.connectorId)}
                  size={28}
                />
              }
              title={
                <Text as="div" intent="small" weight="medium">
                  {getDisplayName(session.connectorId)}
                </Text>
              }
              description={
                <Text as="div" intent="fine" color="mutedForeground">
                  Session stored · {formatBytes(session.sizeBytes)} · Last used{" "}
                  {formatDate(session.lastModified)}
                </Text>
              }
              right={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onClearSession(session.connectorId)}
                >
                  Clear
                </Button>
              }
            />
          ))}
        </SettingsCard>
      )}
    </div>
  )
}
