import type { usePersonalServer } from "@/hooks/usePersonalServer"
import { LogInIcon, PlayIcon, SquareIcon } from "lucide-react"
import { useRef, useState } from "react"
import { Text } from "@/components/typography/text"
import { SettingsRowDescriptionCopy } from "@/pages/settings/components/settings-row-description-copy"
import { SettingsDetailRow } from "@/pages/settings/components/settings-detail-row"
import { SettingsRowDescriptionStatus } from "@/pages/settings/components/settings-row-description-status"
import {
  SettingsCard,
  SettingsCardStack,
  SettingsRowAction,
} from "@/pages/settings/components/settings-shared"

type ServerRuntimeStatus = ReturnType<typeof usePersonalServer>["status"]

type PublicEndpointState = "available" | "unavailable"
const TEST_PUBLIC_ENDPOINT_STATE: PublicEndpointState | null = null
const TEST_PUBLIC_ENDPOINT_URL = "https://abc123.server.vana.org"

function getResolvedEndpoint(tunnelUrl: string | null, port: number | null) {
  if (TEST_PUBLIC_ENDPOINT_STATE === "available") {
    return TEST_PUBLIC_ENDPOINT_URL
  }
  if (TEST_PUBLIC_ENDPOINT_STATE === "unavailable") {
    return null
  }
  if (tunnelUrl) return tunnelUrl
  if (!port) return null
  return `http://127.0.0.1:${port}`
}

function getServerStatusDescription(
  status: ServerRuntimeStatus,
  port: number | null,
  error: string | null
) {
  if (status === "running") {
    return { tone: "success" as const, label: `Running on port ${port ?? "?"}` }
  }
  if (status === "starting") {
    return { tone: "success" as const, label: "Starting…" }
  }
  if (status === "error") {
    return { tone: "destructive" as const, label: error || "Error" }
  }
  return { tone: "warning" as const, label: "Stopped" }
}

interface SettingsPersonalServerSectionProps {
  personalServer: ReturnType<typeof usePersonalServer>
  onRestartPersonalServer: () => void
  onStopPersonalServer: () => void
  onSignInToStart: () => void | Promise<void>
  isAuthenticated: boolean
  personalServerDataPath: string
  onOpenPersonalServerFolder: () => void
}

export function SettingsPersonalServer({
  personalServer,
  onRestartPersonalServer,
  onStopPersonalServer,
  onSignInToStart,
  isAuthenticated,
  personalServerDataPath,
  onOpenPersonalServerFolder,
}: SettingsPersonalServerSectionProps) {
  const previewStatus = personalServer.status
  const previewPort = personalServer.port
  const previewError = personalServer.error
  const previewTunnelUrl = personalServer.tunnelUrl
  const endpoint = getResolvedEndpoint(previewTunnelUrl, previewPort)
  const serverStatusDescription = getServerStatusDescription(
    previewStatus,
    previewPort,
    previewError
  )
  const isLaunchingSignInRef = useRef(false)
  const [isLaunchingSignIn, setIsLaunchingSignIn] = useState(false)

  const handleSignInToStart = async () => {
    if (isLaunchingSignInRef.current) return

    isLaunchingSignInRef.current = true
    setIsLaunchingSignIn(true)
    try {
      await onSignInToStart()
    } finally {
      isLaunchingSignInRef.current = false
      setIsLaunchingSignIn(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="space-y-8">
        <SettingsCardStack>
          <SettingsCard>
            <div className="flex flex-col gap-0 px-4 py-0">
              <SettingsDetailRow
                isLast
                label="Sign in"
                value={
                  <SettingsRowAction
                    variant="dc"
                    isLoading={isLaunchingSignIn}
                    loadingLabel="Opening sign in…"
                    onClick={() => void handleSignInToStart()}
                  >
                    <LogInIcon aria-hidden />
                    Sign in to start
                  </SettingsRowAction>
                }
              />
            </div>
          </SettingsCard>
        </SettingsCardStack>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <SettingsCardStack>
        <SettingsCard>
          <div className="flex flex-col gap-0 px-4 py-0">
            <SettingsDetailRow
              label="Controls"
              value={
                previewStatus === "running" ? (
                  <SettingsRowAction onClick={() => onStopPersonalServer()}>
                    <SquareIcon aria-hidden />
                    Stop
                  </SettingsRowAction>
                ) : !isAuthenticated ? (
                  <SettingsRowAction onClick={() => onSignInToStart()}>
                    <LogInIcon aria-hidden />
                    Sign in to start
                  </SettingsRowAction>
                ) : (
                  <SettingsRowAction
                    onClick={() => onRestartPersonalServer()}
                    isLoading={previewStatus === "starting"}
                    loadingLabel="Starting…"
                  >
                    <PlayIcon aria-hidden />
                    Start
                  </SettingsRowAction>
                )
              }
            />
            <SettingsDetailRow
              label="Server status"
              className="pr-2.5"
              value={
                <SettingsRowDescriptionStatus
                  tone={serverStatusDescription.tone}
                  intent="small"
                  pulse={previewStatus === "starting"}
                >
                  {serverStatusDescription.label}
                </SettingsRowDescriptionStatus>
              }
            />
            <SettingsDetailRow
              isLast
              label="Signed in"
              value={<Text dim>Vana account connected</Text>}
            />
          </div>
        </SettingsCard>
        <SettingsCard>
          <div className="flex flex-col gap-0 px-4 py-0">
            <SettingsDetailRow
              label="Public endpoint"
              className="pr-2.5"
              value={
                <SettingsRowDescriptionCopy
                  value={endpoint}
                  intent="small"
                  emptyLabel="Not available yet. Start server to generate one."
                  copyLabel="Copy URL"
                  textClassName="max-w-[300px] sm:max-w-[420px]"
                  // Callum says I know but don't touch please! :)
                  buttonClassName="max-h-[21.17px]"
                />
              }
            />
            <SettingsDetailRow
              isLast
              label="Data location"
              value={
                <SettingsRowAction
                  onClick={onOpenPersonalServerFolder}
                  disabled={!personalServerDataPath}
                >
                  Open
                </SettingsRowAction>
              }
            />
          </div>
        </SettingsCard>
      </SettingsCardStack>
    </div>
  )
}
