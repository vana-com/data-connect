import {
  CheckCircleIcon,
  ExternalLinkIcon,
  Loader2Icon,
  LogInIcon,
  ServerIcon,
  XCircleIcon,
} from "lucide-react"
import type { usePersonalServer } from "@/hooks/usePersonalServer"
import { OpenExternalLink } from "@/components/typography/link-open-external"
import { Text } from "@/components/typography/text"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/classes"

export interface PersonalServerCardProps {
  isAuthenticated: boolean
  personalServer: ReturnType<typeof usePersonalServer>
  serverId: string | null
  onSignIn: () => void
}

export function PersonalServerCard({
  isAuthenticated,
  personalServer,
  serverId,
  onSignIn,
}: PersonalServerCardProps) {
  const isRunning = personalServer.status === "running"
  const isStarting = personalServer.status === "starting"
  const statusKey = isRunning
    ? "success"
    : isStarting
      ? "accent"
      : personalServer.status === "error"
        ? "destructive"
        : "mutedForeground"

  const statusStyles = {
    success: { text: "text-success", bg: "bg-success/10" },
    accent: { text: "text-accent", bg: "bg-accent/10" },
    destructive: { text: "text-destructive", bg: "bg-destructive/10" },
    mutedForeground: { text: "text-muted-foreground", bg: "bg-muted" },
  } as const

  const currentStatus = statusStyles[statusKey]

  if (!isAuthenticated) {
    return (
      <div className="rounded-card border border-border bg-background p-4">
        <div className="flex items-center gap-4">
          <div className="flex size-10 items-center justify-center rounded-button bg-muted">
            <ServerIcon aria-hidden="true" className="size-5 text-muted-foreground" />
          </div>
          <div className="flex-1 space-y-1">
            <Text as="div" intent="small" weight="medium">
              Personal Server
            </Text>
            <Text as="div" intent="fine" color="mutedForeground">
              Sign in to start your personal server
            </Text>
          </div>
          <Button
            type="button"
            variant="accent"
            size="sm"
            onClick={onSignIn}
          >
            <LogInIcon aria-hidden="true" className="size-4" />
            Sign in
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-card border border-border bg-background p-4">
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "flex size-10 items-center justify-center rounded-button",
            currentStatus.bg
          )}
        >
          {isStarting ? (
            <Loader2Icon
              aria-hidden="true"
              className={cn(
                "size-5 animate-spin motion-reduce:animate-none",
                currentStatus.text
              )}
            />
          ) : (
            <ServerIcon aria-hidden="true" className={cn("size-5", currentStatus.text)} />
          )}
        </div>
        <div className="flex-1 space-y-1">
          <Text as="div" intent="small" weight="medium">
            Personal Server
          </Text>
          <Text as="div" intent="fine" color={statusKey}>
            {isRunning
              ? `Running on port ${personalServer.port}${serverId ? " · Registered" : ""}`
              : isStarting
                ? "Starting..."
                : personalServer.status === "error"
                  ? personalServer.error || "Failed to start"
                  : "Stopped"}
          </Text>
          {isRunning && personalServer.tunnelUrl && (
            <OpenExternalLink
              href={`${personalServer.tunnelUrl}/health`}
              className="mt-0.5 flex items-center gap-1 text-left"
              title={`${personalServer.tunnelUrl}/health`}
            >
              <Text as="span" intent="fine" color="accent" className="hover:underline">
                {personalServer.tunnelUrl.replace(
                  /(0x[a-fA-F0-9]{6})[a-fA-F0-9]+([a-fA-F0-9]{6})/,
                  "$1...$2"
                )}/health
              </Text>
              <ExternalLinkIcon aria-hidden="true" className="size-3 shrink-0 text-accent" />
            </OpenExternalLink>
          )}
        </div>
        {isRunning && (
          <CheckCircleIcon aria-hidden="true" className="size-5 text-success" />
        )}
        {personalServer.status === "error" && (
          <XCircleIcon aria-hidden="true" className="size-5 text-destructive" />
        )}
      </div>
    </div>
  )
}
