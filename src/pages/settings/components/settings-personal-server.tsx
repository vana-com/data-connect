import type { usePersonalServer } from "@/hooks/usePersonalServer"
import { DEV_FLAGS } from "@/config/dev-flags"
import { LogInIcon, PlayIcon, SquareIcon } from "lucide-react"
import { SettingsRowDescriptionCopy } from "@/pages/settings/components/settings-row-description-copy"
import { SettingsDetailRow } from "@/pages/settings/components/settings-detail-row"
import { SettingsRowDescriptionStatus } from "@/pages/settings/components/settings-row-description-status"
import {
  SettingsCard,
  SettingsCardStack,
  SettingsRowAction,
} from "@/pages/settings/components/settings-shared"

type ServerRuntimeStatus = ReturnType<typeof usePersonalServer>["status"]

/*
  ============================================
  UI PREVIEW TEST CONTROLS (MANUAL)
  ============================================
  Edit these while designing this panel.

  TEST_SERVER_STATUS_OVERRIDE:
  - "error"    => error state
  - "stopped"  => stopped state
  - "running"  => running state
  - "starting" => starting state
  - null       => use real runtime status from usePersonalServer
*/
const TEST_SERVER_STATUS_OVERRIDE: ServerRuntimeStatus | null = null
const TEST_SERVER_PORT = 5488
const TEST_SERVER_ERROR = "Could not start server"
const TEST_TUNNEL_URL = "https://abc123.server.vana.org"

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
    return { tone: "warning" as const, label: "Starting…" }
  }
  if (status === "error") {
    return { tone: "destructive" as const, label: error || "Error" }
  }
  return { tone: "destructive" as const, label: "Stopped" }
}

interface SettingsPersonalServerSectionProps {
  personalServer: ReturnType<typeof usePersonalServer>
  onRestartPersonalServer: () => void
  onStopPersonalServer: () => void
  onSignInToStart: () => void
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
  const isTestMode =
    DEV_FLAGS.useSettingsUiMocks && TEST_SERVER_STATUS_OVERRIDE !== null
  const previewStatus = TEST_SERVER_STATUS_OVERRIDE ?? personalServer.status
  const previewPort =
    isTestMode && previewStatus === "running"
      ? TEST_SERVER_PORT
      : personalServer.port
  const previewError =
    isTestMode && previewStatus === "error"
      ? TEST_SERVER_ERROR
      : personalServer.error
  const previewTunnelUrl =
    isTestMode && previewStatus === "running"
      ? TEST_TUNNEL_URL
      : personalServer.tunnelUrl
  const endpoint = getResolvedEndpoint(previewTunnelUrl, previewPort)
  const serverStatusDescription = getServerStatusDescription(
    previewStatus,
    previewPort,
    previewError
  )

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
              labelInfo="Runtime health of your local Personal Server process (running, starting, stopped, or error)."
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
              label="Public endpoint"
              labelInfo="Public URL that routes requests to your Personal Server."
              className="pr-2.5"
              value={
                <SettingsRowDescriptionCopy
                  value={endpoint}
                  intent="small"
                  emptyLabel="Not available yet"
                  copyLabel="Copy URL"
                  // Callum says I know but don't touch please! :)
                  buttonClassName="max-h-[21.17px]"
                />
              }
            />
            <SettingsDetailRow
              isLast
              label="Data location"
              labelInfo="The local folder where your Personal Server data is stored."
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
