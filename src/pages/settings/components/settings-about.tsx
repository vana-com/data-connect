import {
  ExternalLinkIcon,
  InfoIcon,
  PlayIcon,
  CheckCircleIcon,
  XCircleIcon,
  LoaderIcon,
} from "lucide-react"
import { Text } from "@/components/typography/text"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/classes"
import type { BrowserStatus, NodeJsTestResult, PersonalServerInfo } from "../types"
import { SettingsCard, SettingsRow, SettingsSection } from "./settings-shared"

interface SettingsAboutProps {
  appVersion: string
  nodeTestStatus: "idle" | "testing" | "success" | "error"
  nodeTestResult: NodeJsTestResult | null
  nodeTestError: string | null
  browserStatus: BrowserStatus | null
  pathsDebug: Record<string, unknown> | null
  personalServer: PersonalServerInfo
  simulateNoChrome: boolean
  onTestNodeJs: () => void
  onCheckBrowserStatus: () => void
  onDebugPaths: () => void
  onRestartPersonalServer: () => void
  onStopPersonalServer: () => void
  onSimulateNoChromeChange: (value: boolean) => void
}

const statusStyles = {
  success: { text: "text-success", bg: "bg-success/10" },
  accent: { text: "text-accent", bg: "bg-accent/10" },
  destructive: { text: "text-destructive", bg: "bg-destructive/10" },
  mutedForeground: { text: "text-muted-foreground", bg: "bg-muted" },
} as const

export function SettingsAbout({
  appVersion,
  nodeTestStatus,
  nodeTestResult,
  nodeTestError,
  browserStatus,
  pathsDebug,
  personalServer,
  simulateNoChrome,
  onTestNodeJs,
  onCheckBrowserStatus,
  onDebugPaths,
  onRestartPersonalServer,
  onStopPersonalServer,
  onSimulateNoChromeChange,
}: SettingsAboutProps) {
  const nodeStatusKey: keyof typeof statusStyles =
    nodeTestStatus === "success"
      ? "success"
      : nodeTestStatus === "error"
        ? "destructive"
        : nodeTestStatus === "testing"
          ? "accent"
          : "mutedForeground"

  const nodeStatus = statusStyles[nodeStatusKey]

  const serverStatusKey: keyof typeof statusStyles =
    personalServer.status === "running"
      ? "success"
      : personalServer.status === "error"
        ? "destructive"
        : personalServer.status === "starting"
          ? "accent"
          : "mutedForeground"

  const serverStatus = statusStyles[serverStatusKey]
  const nodeState: StatusState =
    nodeTestStatus === "testing"
      ? "loading"
      : nodeTestStatus === "success"
        ? "success"
        : nodeTestStatus === "error"
          ? "error"
          : "idle"
  const serverState: StatusState =
    personalServer.status === "starting"
      ? "loading"
      : personalServer.status === "running"
        ? "success"
        : personalServer.status === "error"
          ? "error"
          : "idle"

  return (
    <div className="space-y-6">
      <SettingsSection title="About">
        <SettingsCard divided>
          <SettingsRow
            iconContainerClassName="bg-muted"
            icon={
              <InfoIcon aria-hidden="true" className="size-5 text-muted-foreground" />
            }
            title={
              <Text as="span" intent="small" weight="medium">
                Version
              </Text>
            }
            right={
              <Text as="span" intent="fine" color="mutedForeground">
                {appVersion || "..."}{" "}
                <Text as="span" intent="fine" color="mutedForeground">
                  ({__COMMIT_HASH__})
                </Text>
              </Text>
            }
            contentClassName="space-y-1"
          />
          <SettingsRow
            iconContainerClassName="bg-muted"
            icon={
              <InfoIcon aria-hidden="true" className="size-5 text-muted-foreground" />
            }
            title={
              <Text as="span" intent="small" weight="medium">
                Framework
              </Text>
            }
            right={
              <Text as="span" intent="fine" color="mutedForeground">
                Tauri v2
              </Text>
            }
            contentClassName="space-y-1"
          />
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title="Diagnostics">
        <SettingsCard divided>
          <SettingsRow
            iconContainerClassName={nodeStatus.bg}
            icon={<StatusIcon state={nodeState} className={nodeStatus.text} />}
            title={
              <Text as="div" intent="small" weight="medium">
                Node.js Runtime
              </Text>
            }
            description={
              <Text as="div" intent="fine" color={nodeStatusKey}>
                {nodeTestStatus === "idle" && "Test bundled Node.js runtime"}
                {nodeTestStatus === "testing" && "Testing..."}
                {nodeTestStatus === "success" &&
                  nodeTestResult &&
                  `${nodeTestResult.nodejs} on ${nodeTestResult.platform}/${nodeTestResult.arch}`}
                {nodeTestStatus === "error" && (nodeTestError || "Test failed")}
              </Text>
            }
            right={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onTestNodeJs}
                disabled={nodeTestStatus === "testing"}
              >
                {nodeTestStatus === "testing" ? "Testing..." : "Test"}
              </Button>
            }
          />
          {nodeTestStatus === "success" && nodeTestResult && (
            <div className="bg-muted px-4 py-3">
              <div className="grid gap-2 text-xs md:grid-cols-2">
                <Text as="div" intent="fine" color="mutedForeground">
                  Hostname:{" "}
                  <Text as="span" intent="fine" color="foreground">
                    {nodeTestResult.hostname}
                  </Text>
                </Text>
                <Text as="div" intent="fine" color="mutedForeground">
                  CPUs:{" "}
                  <Text as="span" intent="fine" color="foreground">
                    {nodeTestResult.cpus}
                  </Text>
                </Text>
                <Text as="div" intent="fine" color="mutedForeground">
                  Memory:{" "}
                  <Text as="span" intent="fine" color="foreground">
                    {nodeTestResult.memory}
                  </Text>
                </Text>
                <Text as="div" intent="fine" color="mutedForeground">
                  Uptime:{" "}
                  <Text as="span" intent="fine" color="foreground">
                    {nodeTestResult.uptime}
                  </Text>
                </Text>
              </div>
            </div>
          )}

          <SettingsRow
            iconContainerClassName={serverStatus.bg}
            icon={<StatusIcon state={serverState} className={serverStatus.text} />}
            title={
              <Text as="div" intent="small" weight="medium">
                Personal Server
              </Text>
            }
            description={
              <Text as="div" intent="fine" color={serverStatusKey}>
                {personalServer.status === "stopped" && "Not running"}
                {personalServer.status === "starting" && "Starting..."}
                {personalServer.status === "running" &&
                  `Running on port ${personalServer.port}`}
                {personalServer.status === "error" &&
                  (personalServer.error || "Failed to start")}
              </Text>
            }
            right={
              personalServer.status === "running" ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onStopPersonalServer}
                >
                  Stop
                </Button>
              ) : personalServer.status !== "starting" ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onRestartPersonalServer}
                >
                  Start
                </Button>
              ) : null
            }
          />

          {personalServer.status === "running" && personalServer.port && (
            <div className="px-4 pb-4">
              <Button asChild variant="ghost" size="sm">
                <a
                  href={`http://localhost:${personalServer.port}/status`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Health check
                  <ExternalLinkIcon aria-hidden="true" className="size-4" />
                </a>
              </Button>
            </div>
          )}

          <SettingsRow
            iconContainerClassName="bg-muted"
            icon={
              browserStatus?.available ? (
                <CheckCircleIcon aria-hidden="true" className="size-5 text-success" />
              ) : (
                <XCircleIcon aria-hidden="true" className="size-5 text-accent" />
              )
            }
            title={
              <Text as="div" intent="small" weight="medium">
                Browser
              </Text>
            }
            description={
              <Text as="div" intent="fine" color="mutedForeground">
                {browserStatus === null
                  ? "Checking..."
                  : browserStatus.available
                    ? `${browserStatus.browser_type === "system" ? "System Chrome/Edge" : "Downloaded Chromium"} found`
                    : "No browser found"}
              </Text>
            }
            right={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onCheckBrowserStatus}
              >
                Refresh
              </Button>
            }
          />

          <div className="flex items-center justify-between border-t border-border/50 px-4 py-3">
            <div className="space-y-0.5">
              <Text as="div" intent="small" weight="medium">
                Simulate No System Browser
              </Text>
              <Text as="div" intent="fine" color="mutedForeground">
                Testing: pretend system Chrome/Edge is not installed
              </Text>
            </div>
            <Button
              type="button"
              variant={simulateNoChrome ? "default" : "outline"}
              size="sm"
              onClick={() => onSimulateNoChromeChange(!simulateNoChrome)}
            >
              {simulateNoChrome ? "On" : "Off"}
            </Button>
          </div>

          <SettingsRow
            iconContainerClassName="bg-muted"
            icon={
              <InfoIcon aria-hidden="true" className="size-5 text-muted-foreground" />
            }
            title={
              <Text as="div" intent="small" weight="medium">
                Connector Paths
              </Text>
            }
            description={
              <Text as="div" intent="fine" color="mutedForeground">
                Debug where app looks for connectors
              </Text>
            }
            right={
              <Button type="button" variant="outline" size="sm" onClick={onDebugPaths}>
                Debug
              </Button>
            }
          />
          {pathsDebug && (
            <div className="bg-muted px-4 py-3">
              <Text as="pre" pre className="text-xs">
                <code>{JSON.stringify(pathsDebug, null, 2)}</code>
              </Text>
            </div>
          )}
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title="Resources">
        <SettingsCard divided>
          <SettingsResourceLink href="https://github.com" label="GitHub Repository" />
          <SettingsResourceLink
            href="https://docs.databridge.dev"
            label="Documentation"
          />
        </SettingsCard>
      </SettingsSection>
    </div>
  )
}

type StatusState = "loading" | "success" | "error" | "idle"

interface StatusIconProps {
  state: StatusState
  className?: string
}

function StatusIcon({ state, className }: StatusIconProps) {
  if (state === "loading") {
    return (
      <LoaderIcon
        aria-hidden="true"
        className={cn("size-5 animate-spin motion-reduce:animate-none", className)}
      />
    )
  }

  if (state === "success") {
    return <CheckCircleIcon aria-hidden="true" className={cn("size-5", className)} />
  }

  if (state === "error") {
    return <XCircleIcon aria-hidden="true" className={cn("size-5", className)} />
  }

  return <PlayIcon aria-hidden="true" className={cn("size-5", className)} />
}

interface SettingsResourceLinkProps {
  href: string
  label: string
}

function SettingsResourceLink({ href, label }: SettingsResourceLinkProps) {
  return (
    <Button asChild variant="ghost" className="w-full justify-between px-4 py-3">
      <a href={href} target="_blank" rel="noopener noreferrer">
        {label}
        <ExternalLinkIcon aria-hidden="true" className="size-4 text-muted-foreground" />
      </a>
    </Button>
  )
}
