import type { usePersonalServer } from "@/hooks/usePersonalServer"
import {
  SettingsCard,
  SettingsCardStack,
} from "@/pages/settings/components/settings-shared"
import { EndpointRow } from "./endpoint-row"
import { StatusRow } from "./status-row"

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

interface SettingsPersonalServerSectionProps {
  personalServer: ReturnType<typeof usePersonalServer>
}

export function SettingsPersonalServerSection({
  personalServer,
}: SettingsPersonalServerSectionProps) {
  const previewStatus = TEST_SERVER_STATUS_OVERRIDE ?? personalServer.status
  const previewPort =
    previewStatus === "running" ? TEST_SERVER_PORT : personalServer.port
  const previewError =
    previewStatus === "error" ? TEST_SERVER_ERROR : personalServer.error
  const previewTunnelUrl =
    previewStatus === "running" ? TEST_TUNNEL_URL : personalServer.tunnelUrl

  return (
    <div className="space-y-8">
      <SettingsCardStack>
        <SettingsCard>
          <div className="flex flex-col gap-0 px-4 py-0">
            <StatusRow
              status={previewStatus}
              port={previewPort}
              error={previewError}
            />
            <EndpointRow tunnelUrl={previewTunnelUrl} port={previewPort} />
          </div>
        </SettingsCard>
      </SettingsCardStack>
    </div>
  )
}
