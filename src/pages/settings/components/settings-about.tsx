import { useCallback, useEffect, useState } from "react"
import {
  ArrowUpRightIcon,
  BookOpenIcon,
  GithubIcon,
  InfoIcon,
  ScrollTextIcon,
  ChevronsLeftRightEllipsisIcon,
  SquarePlayIcon,
  PanelTopIcon,
  FlaskConicalIcon,
  ServerIcon,
} from "lucide-react"
import { SettingsRowDescriptionCopy } from "@/pages/settings/components/settings-row-description-copy"
import { SettingsRowDescriptionStatus } from "@/pages/settings/components/settings-row-description-status"
import { Text } from "@/components/typography/text"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/classes"
import type {
  BrowserStatus,
  NodeJsTestResult,
  PersonalServerInfo,
} from "../types"
import {
  SettingsCard,
  SettingsCardStack,
  SettingsRowAction,
  SettingsSection,
} from "./settings-shared"
import { SettingsRow } from "./settings-row"

interface SettingsAboutProps {
  appVersion: string
  logPath: string
  nodeTestStatus: "idle" | "testing" | "success" | "error"
  nodeTestResult: NodeJsTestResult | null
  nodeTestError: string | null
  browserStatus: BrowserStatus | null
  pathsDebug: Record<string, unknown> | null
  personalServer: PersonalServerInfo
  simulateNoChrome: boolean
  onTestNodeJs: () => void
  onCheckBrowserStatus: () => void | Promise<void>
  onDebugPaths: () => void
  onClearDebugPaths: () => void
  onRestartPersonalServer: () => void
  onStopPersonalServer: () => void
  onSimulateNoChromeChange: (value: boolean) => void
  onOpenLogFolder: () => void
}

const BROWSER_REFRESH_FEEDBACK_MS = 700

export function SettingsAbout({
  appVersion,
  logPath,
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
  onClearDebugPaths,
  onRestartPersonalServer,
  onStopPersonalServer,
  onSimulateNoChromeChange,
  onOpenLogFolder,
}: SettingsAboutProps) {
  const [isBrowserRefreshLoading, setIsBrowserRefreshLoading] = useState(false)
  const [isNodeTestResultOpen, setIsNodeTestResultOpen] = useState(false)

  const handleCheckBrowserStatus = useCallback(() => {
    if (isBrowserRefreshLoading) {
      return
    }

    setIsBrowserRefreshLoading(true)

    void Promise.all([
      Promise.resolve(onCheckBrowserStatus()),
      new Promise<void>(resolve => {
        window.setTimeout(resolve, BROWSER_REFRESH_FEEDBACK_MS)
      }),
    ]).finally(() => {
      setIsBrowserRefreshLoading(false)
    })
  }, [isBrowserRefreshLoading, onCheckBrowserStatus])

  useEffect(() => {
    if (nodeTestStatus !== "success") {
      setIsNodeTestResultOpen(false)
      return
    }

    if (nodeTestResult) {
      setIsNodeTestResultOpen(true)
    }
  }, [nodeTestResult, nodeTestStatus])

  const handleNodeTestAction = useCallback(() => {
    if (nodeTestStatus === "success" && isNodeTestResultOpen) {
      setIsNodeTestResultOpen(false)
      return
    }

    onTestNodeJs()
  }, [isNodeTestResultOpen, nodeTestStatus, onTestNodeJs])

  const nodeStatusDescription =
    nodeTestStatus === "success"
      ? {
          tone: "success" as const,
          label: nodeTestResult
            ? `${nodeTestResult.nodejs} on ${nodeTestResult.platform}/${nodeTestResult.arch}`
            : "Node.js runtime available",
        }
      : nodeTestStatus === "error"
        ? {
            tone: "destructive" as const,
            label: nodeTestError || "Test failed",
          }
        : nodeTestStatus === "testing"
          ? { tone: "accent" as const, label: "Testing…" }
          : { tone: "muted" as const, label: "Test bundled Node.js runtime" }

  const personalServerStatusDescription =
    personalServer.status === "running"
      ? {
          tone: "success" as const,
          label: `Running on port ${personalServer.port ?? "?"}`,
        }
      : personalServer.status === "error"
        ? {
            tone: "destructive" as const,
            label: personalServer.error || "Failed to start",
          }
        : personalServer.status === "starting"
          ? { tone: "accent" as const, label: "Starting…" }
          : { tone: "destructive" as const, label: "Not running" }

  const browserStatusDescription =
    browserStatus === null
      ? { tone: "muted" as const, label: "Checking…" }
      : browserStatus.available
        ? {
            tone: "success" as const,
            label:
              browserStatus.browser_type === "system"
                ? "System Chrome/Edge found"
                : "Downloaded Chromium found",
          }
        : { tone: "destructive" as const, label: "No browser found" }

  return (
    <div className="space-y-6">
      <SettingsSection title="About">
        <SettingsCardStack>
          <SettingsCard divided>
            <SettingsRow
              icon={<InfoIcon aria-hidden="true" />}
              title="Version"
              right={
                <Text as="span" intent="small" muted>
                  {appVersion || "…"} ({__COMMIT_HASH__})
                </Text>
              }
            />
          </SettingsCard>
        </SettingsCardStack>
      </SettingsSection>

      <SettingsSection title="Diagnostics">
        <SettingsCardStack>
          <SettingsCard divided>
            <SettingsRow
              icon={<SquarePlayIcon aria-hidden="true" />}
              title="Node.js Runtime"
              description={
                <SettingsRowDescriptionStatus tone={nodeStatusDescription.tone}>
                  {nodeStatusDescription.label}
                </SettingsRowDescriptionStatus>
              }
              right={
                <SettingsRowAction
                  onClick={handleNodeTestAction}
                  isLoading={nodeTestStatus === "testing"}
                  loadingLabel="Testing…"
                >
                  {nodeTestStatus === "success" && isNodeTestResultOpen
                    ? "Close"
                    : "Test"}
                </SettingsRowAction>
              }
              below={
                nodeTestStatus === "success" &&
                nodeTestResult &&
                isNodeTestResultOpen ? (
                  <div className="bg-background px-4 pb-3 pl-[62px]">
                    <hr className="border-border/70" />
                    <div className="grid gap-1 md:grid-cols-2 pt-3">
                      <Text as="div" intent="fine" color="mutedForeground">
                        Hostname: {nodeTestResult.hostname}
                      </Text>
                      <Text as="div" intent="fine" color="mutedForeground">
                        CPUs: {nodeTestResult.cpus}
                      </Text>
                      <Text as="div" intent="fine" color="mutedForeground">
                        Memory: {nodeTestResult.memory}
                      </Text>
                      <Text as="div" intent="fine" color="mutedForeground">
                        Uptime: {nodeTestResult.uptime}
                      </Text>
                    </div>
                  </div>
                ) : null
              }
            />

            <SettingsRow
              icon={<ServerIcon aria-hidden="true" />}
              title="Personal Server"
              description={
                <SettingsRowDescriptionStatus
                  tone={personalServerStatusDescription.tone}
                >
                  {personalServerStatusDescription.label}
                </SettingsRowDescriptionStatus>
              }
              right={
                personalServer.status === "running" ? (
                  <SettingsRowAction onClick={onStopPersonalServer}>
                    Stop
                  </SettingsRowAction>
                ) : (
                  <SettingsRowAction
                    onClick={onRestartPersonalServer}
                    isLoading={personalServer.status === "starting"}
                    loadingLabel="Starting…"
                  >
                    Start
                  </SettingsRowAction>
                )
              }
            />
            {/* opens JSON health info in browser */}
            {/* {personalServer.status === "running" && personalServer.port && (
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
            )} */}

            <SettingsRow
              icon={<PanelTopIcon aria-hidden="true" />}
              title="Browser"
              description={
                <SettingsRowDescriptionStatus
                  tone={browserStatusDescription.tone}
                >
                  {browserStatusDescription.label}
                </SettingsRowDescriptionStatus>
              }
              right={
                <SettingsRowAction
                  onClick={handleCheckBrowserStatus}
                  isLoading={isBrowserRefreshLoading}
                  loadingLabel="Refreshing…"
                >
                  Refresh
                </SettingsRowAction>
              }
            />

            <SettingsRow
              icon={<FlaskConicalIcon aria-hidden="true" />}
              title="Simulate No System Browser"
              description="Testing: pretend system Chrome/Edge is not installed"
              right={
                <div className="pr-2">
                  <Switch
                    checked={simulateNoChrome}
                    onCheckedChange={onSimulateNoChromeChange}
                    aria-label="Simulate no system browser"
                    className={cn(
                      // geometry
                      "[--switch-w:48px] [--switch-h:20px] [--thumb-w:24px] [--thumb-h:16px] [--switch-border:1px]",
                      // size
                      "h-(--switch-h) w-(--switch-w)",
                      // thumb size + shape
                      "**:data-[slot=switch-thumb]:h-(--thumb-h)",
                      "**:data-[slot=switch-thumb]:w-(--thumb-w)",
                      // thumb position by state
                      "[&_[data-slot=switch-thumb][data-state=unchecked]]:translate-x-[calc((var(--switch-h)-var(--thumb-h))/2-var(--switch-border))]",
                      "[&_[data-slot=switch-thumb][data-state=checked]]:translate-x-[calc(var(--switch-w)-var(--switch-border)-var(--thumb-w)-((var(--switch-h)-var(--thumb-h))/2))]"
                    )}
                  />
                </div>
              }
            />

            <SettingsRow
              icon={<ChevronsLeftRightEllipsisIcon aria-hidden="true" />}
              title="Connector Paths"
              description="Debug where app looks for connectors"
              right={
                <SettingsRowAction
                  onClick={pathsDebug ? onClearDebugPaths : onDebugPaths}
                >
                  {pathsDebug ? "Close" : "Debug"}
                </SettingsRowAction>
              }
              below={
                pathsDebug ? (
                  <div className="h-[400px] bg-background overflow-hidden px-4 pb-3 pl-[62px]">
                    <hr className="border-border/70" />
                    <div className="h-full overflow-auto px-4 pt-3">
                      <Text pre intent="fine" dim>
                        <code>{JSON.stringify(pathsDebug, null, 2)}</code>
                      </Text>
                    </div>
                  </div>
                ) : null
              }
            />
          </SettingsCard>
        </SettingsCardStack>
      </SettingsSection>

      <SettingsSection
        title="Logs"
        description="Share these logs with support when reporting issues."
      >
        <SettingsCardStack>
          <SettingsCard divided>
            <SettingsRow
              icon={<ScrollTextIcon aria-hidden="true" />}
              title="Application Logs"
              description={
                <SettingsRowDescriptionCopy
                  value={logPath || null}
                  emptyLabel="Loading…"
                  copyLabel="Copy path"
                  iconPosition="after"
                />
              }
              right={
                <SettingsRowAction
                  onClick={onOpenLogFolder}
                  disabled={!logPath}
                >
                  Open
                </SettingsRowAction>
              }
            />
          </SettingsCard>
        </SettingsCardStack>
      </SettingsSection>

      <SettingsSection title="Resources">
        <SettingsCardStack>
          <SettingsCard divided>
            <SettingsRow
              icon={<GithubIcon aria-hidden="true" />}
              title="GitHub Repository"
              right={
                <SettingsRowAction asChild>
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gap-0.75!"
                  >
                    Open
                    <ArrowUpRightIcon aria-hidden="true" />
                  </a>
                </SettingsRowAction>
              }
            />
            <SettingsRow
              icon={<BookOpenIcon aria-hidden="true" />}
              title="Documentation"
              right={
                <SettingsRowAction asChild>
                  <a
                    href="https://docs.dataconnect.dev"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gap-0.75!"
                  >
                    Open
                    <ArrowUpRightIcon aria-hidden="true" />
                  </a>
                </SettingsRowAction>
              }
            />
          </SettingsCard>
        </SettingsCardStack>
      </SettingsSection>
    </div>
  )
}
