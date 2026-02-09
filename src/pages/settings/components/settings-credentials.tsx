import { KeyIcon, Trash2Icon } from "lucide-react"
import type { BrowserSession } from "../types"
import { Text } from "@/components/typography/text"
import { Button } from "@/components/ui/button"
import { SettingsCard, SettingsRow, SettingsSection } from "./settings-shared"

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
    <div>
      <SettingsSection title="Browser sessions">
        {sessions.length === 0 ? (
          <SettingsCard contentClassName="p-12 text-center">
            <KeyIcon
              aria-hidden="true"
              className="mx-auto size-12 text-muted-foreground"
            />
            <Text as="h3" intent="heading" weight="semi" className="mt-4">
              No stored sessions
            </Text>
            <Text
              as="p"
              intent="small"
              color="mutedForeground"
              className="mt-2 max-w-sm mx-auto"
            >
              When you log in to a platform through a connector, your browser
              session is stored here so you don't have to log in again next
              time.
            </Text>
          </SettingsCard>
        ) : (
          <SettingsCard divided>
            {sessions.map(session => (
              <SettingsRow
                key={session.connectorId}
                iconContainerClassName="bg-muted"
                icon={
                  <KeyIcon aria-hidden="true" className="size-4 text-muted-foreground" />
                }
                title={
                  <Text as="div" intent="small" weight="medium">
                    {getDisplayName(session.connectorId)}
                  </Text>
                }
                description={
                  <Text as="div" intent="fine" color="mutedForeground">
                    Session stored · {formatBytes(session.sizeBytes)} · Last
                    used {formatDate(session.lastModified)}
                  </Text>
                }
                right={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-destructive/30 text-destructive hover:bg-destructive/10"
                    onClick={() => onClearSession(session.connectorId)}
                  >
                    <Trash2Icon aria-hidden="true" className="size-4" />
                    Clear
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
