import { useState, useEffect } from "react"
import { FolderOpenIcon, DatabaseIcon, CheckCircleIcon, ServerIcon } from "lucide-react"
import { fetchServerIdentity } from "../../../services/serverRegistration"
import { Text } from "@/components/typography/text"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/classes"
import { SettingsCard, SettingsRow, SettingsSection } from "./settings-shared"

interface SettingsStorageProps {
  dataPath: string
  onOpenDataFolder: () => void
  personalServerPort: number | null
  personalServerStatus: string
  walletAddress: string | null
}

const storageOptions = [
  { label: "Vana Storage", status: "Coming soon" },
  { label: "Google Drive", status: "Coming soon" },
  { label: "Dropbox", status: "Coming soon" },
] as const

export function SettingsStorage({
  dataPath,
  onOpenDataFolder,
  personalServerPort,
  personalServerStatus,
}: SettingsStorageProps) {
  const [serverId, setServerId] = useState<string | null>(null)
  const [identityChecked, setIdentityChecked] = useState(false)

  useEffect(() => {
    if (personalServerPort && personalServerStatus === "running") {
      fetchServerIdentity(personalServerPort)
        .then(identity => {
          setServerId(identity.serverId)
          setIdentityChecked(true)
        })
        .catch(() => setIdentityChecked(true))
    }
  }, [personalServerPort, personalServerStatus])

  const isServerRunning = personalServerStatus === "running"
  const isStarting = personalServerStatus === "starting"
  const isRegistered = !!serverId

  return (
    <div className="space-y-6">
      <SettingsSection title="Local Data">
        <SettingsCard>
          <SettingsRow
            iconContainerClassName="bg-accent/10"
            icon={<DatabaseIcon aria-hidden="true" className="size-5 text-accent" />}
            title={
              <Text as="div" intent="small" weight="medium">
                Export location
              </Text>
            }
            description={
              <Text as="div" intent="fine" color="mutedForeground" truncate>
                {dataPath}
              </Text>
            }
            right={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onOpenDataFolder}
              >
                <FolderOpenIcon aria-hidden="true" className="size-4" />
                Open
              </Button>
            }
          />
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title="Storage">
        <SettingsCard divided>
          <SettingsRow
            iconContainerClassName="bg-accent/10"
            icon={<DatabaseIcon aria-hidden="true" className="size-5 text-accent" />}
            title={
              <Text as="div" intent="small" weight="medium">
                Local Storage
              </Text>
            }
            description={
              <Text as="div" intent="fine" color="mutedForeground">
                Selected
              </Text>
            }
            right={<CheckCircleIcon aria-hidden="true" className="size-5 text-accent" />}
          />
          {storageOptions.map(item => (
            <SettingsRow
              key={item.label}
              className="opacity-60"
              iconContainerClassName="bg-muted"
              icon={
                <DatabaseIcon
                  aria-hidden="true"
                  className="size-5 text-muted-foreground"
                />
              }
              title={
                <Text as="div" intent="small" weight="medium">
                  {item.label}
                </Text>
              }
              description={
                <Text as="div" intent="fine" color="mutedForeground">
                  {item.status}
                </Text>
              }
            />
          ))}
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title="Server">
        <SettingsCard divided>
          <SettingsRow
            iconContainerClassName="bg-accent/10"
            icon={<DatabaseIcon aria-hidden="true" className="size-5 text-accent" />}
            title={
              <Text as="div" intent="small" weight="medium">
                Self-hosted
              </Text>
            }
            description={
              <Text as="div" intent="fine" color="mutedForeground">
                Selected
              </Text>
            }
            right={<CheckCircleIcon aria-hidden="true" className="size-5 text-accent" />}
          />
          <SettingsRow
            className="opacity-60"
            iconContainerClassName="bg-muted"
            icon={
              <DatabaseIcon aria-hidden="true" className="size-5 text-muted-foreground" />
            }
            title={
              <Text as="div" intent="small" weight="medium">
                OpenDataLabs Cloud
              </Text>
            }
            description={
              <Text as="div" intent="fine" color="mutedForeground">
                Coming soon
              </Text>
            }
          />
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title="Personal Server">
        <SettingsCard divided>
          <SettingsRow
            iconContainerClassName={cn(
              isServerRunning ? "bg-success/10" : isStarting ? "bg-accent/10" : "bg-muted"
            )}
            icon={
              <ServerIcon
                aria-hidden="true"
                className={cn(
                  "size-5",
                  isServerRunning
                    ? "text-success"
                    : isStarting
                      ? "text-accent"
                      : "text-muted-foreground"
                )}
              />
            }
            title={
              <Text as="div" intent="small" weight="medium">
                Status
              </Text>
            }
            description={
              <Text
                as="div"
                intent="fine"
                color={
                  isServerRunning ? "success" : isStarting ? "accent" : "mutedForeground"
                }
              >
                {isServerRunning
                  ? `Running on port ${personalServerPort}`
                  : isStarting
                    ? "Starting..."
                    : "Stopped"}
              </Text>
            }
          />

          <SettingsRow
            iconContainerClassName={cn(isRegistered ? "bg-success/10" : "bg-accent/10")}
            icon={
              isRegistered ? (
                <CheckCircleIcon aria-hidden="true" className="size-5 text-success" />
              ) : (
                <DatabaseIcon aria-hidden="true" className="size-5 text-accent" />
              )
            }
            title={
              <Text as="div" intent="small" weight="medium">
                Registration
              </Text>
            }
            description={
              <Text
                as="div"
                intent="fine"
                color={isRegistered ? "success" : "mutedForeground"}
              >
                {!isServerRunning
                  ? "Server not running"
                  : !identityChecked
                    ? "Checking..."
                    : isRegistered
                      ? `Registered (${serverId})`
                      : "Not registered — will register on next sign-in"}
              </Text>
            }
          />
        </SettingsCard>
      </SettingsSection>
    </div>
  )
}
