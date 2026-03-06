import { Text } from "@/components/typography/text"
import type { usePersonalServer } from "@/hooks/usePersonalServer"
import { SettingsDetailRow } from "@/pages/settings/components/settings-detail-row"
import { SettingsRow } from "@/pages/settings/components/settings-row"
import { SettingsRowDescriptionCopy } from "@/pages/settings/components/settings-row-description-copy"
import { SettingsRowDescriptionStatus } from "@/pages/settings/components/settings-row-description-status"
import {
  SettingsCard,
  SettingsCardStack,
  SettingsRowAction,
  SettingsSection,
} from "@/pages/settings/components/settings-shared"
import { LogInIcon, PlayIcon, SquareIcon } from "lucide-react"
import { useRef, useState } from "react"

type ServerRuntimeStatus = ReturnType<typeof usePersonalServer>["status"]

type PublicEndpointState = "available" | "unavailable"
const TEST_PUBLIC_ENDPOINT_STATE: PublicEndpointState | null = null
const TEST_PUBLIC_ENDPOINT_URL = "https://abc123.server.vana.org"

type ResolvedEndpointInfo =
  | { kind: "public"; url: string }
  | { kind: "local"; url: string }
  | { kind: "none"; url: null }

function getResolvedEndpoint(
  tunnelUrl: string | null,
  port: number | null
): ResolvedEndpointInfo {
  if (TEST_PUBLIC_ENDPOINT_STATE === "available") {
    return { kind: "public", url: TEST_PUBLIC_ENDPOINT_URL }
  }
  if (TEST_PUBLIC_ENDPOINT_STATE === "unavailable") {
    return { kind: "none", url: null }
  }
  if (tunnelUrl) return { kind: "public", url: tunnelUrl }
  if (!port) return { kind: "none", url: null }
  return { kind: "local", url: `http://127.0.0.1:${port}` }
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
    return { tone: "accent" as const, label: "Starting…" }
  }
  if (status === "error") {
    return { tone: "destructive" as const, label: error || "Error" }
  }
  return { tone: "warning" as const, label: "Stopped" }
}

function getEndpointEmptyLabel(status: ServerRuntimeStatus): string {
  if (status === "starting") {
    return "Generating…"
  }
  if (status === "stopped") {
    return "Server is stopped. Endpoint unavailable."
  }
  if (status === "error") {
    return "Server failed to start. Retry to regenerate endpoint."
  }
  return "Not available yet."
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
  const endpointLabel =
    endpoint.kind === "public"
      ? "Public endpoint"
      : endpoint.kind === "local"
        ? "Local endpoint"
        : "Endpoint"
  const serverStatusDescription = getServerStatusDescription(
    previewStatus,
    previewPort,
    previewError
  )
  const endpointEmptyLabel = getEndpointEmptyLabel(previewStatus)
  const controlAction =
    previewStatus === "running" ? (
      <SettingsRowAction onClick={() => onStopPersonalServer()}>
        <SquareIcon aria-hidden />
        Stop
      </SettingsRowAction>
    ) : previewStatus === "error" || previewStatus === "stopped" ? (
      <SettingsRowAction onClick={() => onRestartPersonalServer()}>
        <PlayIcon aria-hidden />
        Retry start
      </SettingsRowAction>
    ) : null
  const controlStatusLabel =
    previewStatus === "running" ? "Running" : serverStatusDescription.label
  const controlTitle = (
    <>
      <span className="font-semibold">Status</span>
      <SettingsRowDescriptionStatus
        tone={serverStatusDescription.tone}
        intent="body"
        pulse={previewStatus === "starting"}
        className="translate-y-[-0.1em]"
      >
        {controlStatusLabel}
      </SettingsRowDescriptionStatus>
    </>
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
            <SettingsRow
              wrapIcon={false}
              icon={null}
              title="Sign in with Vana"
              // Needed before apps can request approved data.
              description="Lets connected apps request approved data"
              wrapDescriptionBelowSm
              right={
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
          </SettingsCard>
        </SettingsCardStack>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <SettingsSection title="Control">
        <SettingsCardStack>
          <SettingsCard>
            <div className="flex flex-col gap-0">
              <SettingsRow
                wrapIcon={false}
                icon={null}
                title={controlTitle}
                contentClassName="flex items-baseline gap-1.75"
                right={controlAction}
                className="h-tab"
              />
              <SettingsDetailRow
                isLast
                className="px-4"
                label="Authentication"
                value={
                  <Text intent="small" dim className="pr-2.5">
                    Vana account connected
                  </Text>
                }
              />
            </div>
          </SettingsCard>
        </SettingsCardStack>
      </SettingsSection>
      <SettingsSection title="Runtime">
        <SettingsCardStack>
          <SettingsCard>
            <SettingsDetailRow
              label={endpointLabel}
              className="px-4"
              value={
                <SettingsRowDescriptionCopy
                  value={endpoint.url}
                  intent="small"
                  emptyLabel={endpointEmptyLabel}
                  copyLabel="Copy URL"
                  // className={cn(previewStatus !== "running" && "pr-2.5")}
                  className="pr-2.5"
                  textClassName="max-w-[300px] sm:max-w-[420px]"
                  // Callum says I know but don't touch please! :)
                  buttonClassName="max-h-[21.17px]"
                />
              }
            />
            <SettingsDetailRow
              isLast
              className="px-4"
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
          </SettingsCard>
        </SettingsCardStack>
      </SettingsSection>
    </div>
  )
}
