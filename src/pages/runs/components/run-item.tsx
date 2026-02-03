import { ChevronDownIcon, ChevronUpIcon, FolderOpenIcon } from "lucide-react"
import type { Run } from "../../../types"
import { PlatformChatGPTIcon } from "@/components/icons/platform-chatgpt"
import { Text } from "@/components/typography/text"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/classes"
import { useRunItem } from "./use-run-item"
import { getIngestStatusIcon, getRunStatusIcon } from "./run-icons"

export interface RunItemProps {
  run: Run
  onStop: (id: string) => void
  serverPort: number | null
  serverReady: boolean
}

export function RunItem({ run, onStop, serverPort, serverReady }: RunItemProps) {
  const {
    expanded,
    loadingData,
    ingestStatus,
    ingestButtonLabel,
    formattedDate,
    conversations,
    scope,
    canIngest,
    showExpandToggle,
    handleToggleExpanded,
    handleIngest,
    openFolder,
  } = useRunItem({ run, serverPort, serverReady })

  return (
    <div className="rounded-card border border-border bg-background">
      <div className="flex items-center gap-4 p-4">
        <div className="flex size-10 items-center justify-center rounded-button bg-foreground text-background">
          <PlatformChatGPTIcon className="size-6" aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <Text as="div" intent="small" weight="medium" truncate>
              {run.name}
            </Text>
            {getRunStatusIcon(run.status)}
          </div>
          <Text as="p" intent="fine" color="mutedForeground">
            {formattedDate}
            {run.status === "success" && run.itemsExported != null && (
              <Text as="span" intent="fine" color="success" className="ml-2">
                {run.itemsExported} {run.itemLabel || "items"}
              </Text>
            )}
            {run.status === "error" && (
              <Text as="span" intent="fine" color="destructive" className="ml-2">
                Failed
              </Text>
            )}
            {run.status === "stopped" && (
              <Text as="span" intent="fine" color="mutedForeground" className="ml-2">
                Stopped
              </Text>
            )}
          </Text>
        </div>

        <div className="flex items-center gap-2">
          {run.status === "running" && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => onStop(run.id)}
            >
              Stop
            </Button>
          )}
          {run.exportPath && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={openFolder}
              aria-label="Open folder"
              title="Open folder"
            >
              <FolderOpenIcon aria-hidden="true" className="size-4" />
            </Button>
          )}
          {run.exportPath && scope && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleIngest}
              disabled={
                !canIngest || ingestStatus === "sending" || ingestStatus === "sent"
              }
              title={
                !serverReady
                  ? "Personal server not running"
                  : ingestStatus === "sent"
                    ? "Sent to personal server"
                    : "Send to personal server"
              }
              className={cn(
                ingestStatus === "sent" && "border-success/40 text-success",
                ingestStatus === "error" && "border-destructive/40 text-destructive",
                ingestStatus === "idle" && canIngest && "border-accent/40 text-accent",
                !canIngest && "text-muted-foreground"
              )}
            >
              {getIngestStatusIcon(ingestStatus)}
              {ingestButtonLabel}
            </Button>
          )}
          {showExpandToggle && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleToggleExpanded}
              aria-label={expanded ? "Collapse run details" : "Expand run details"}
            >
              {expanded ? (
                <ChevronUpIcon aria-hidden="true" className="size-4" />
              ) : (
                <ChevronDownIcon aria-hidden="true" className="size-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      {run.status === "running" && (
        <div className="space-y-3 px-4 pb-4">
          {run.phase && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {Array.from({ length: run.phase.total }, (_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "size-2 rounded-full",
                      i + 1 <= run.phase!.step ? "bg-accent" : "bg-border"
                    )}
                  />
                ))}
                <Text as="span" intent="fine" color="mutedForeground" className="ml-2">
                  Step {run.phase.step} of {run.phase.total}
                </Text>
              </div>
              <Text as="div" intent="small" weight="medium">
                {run.phase.label}
                {run.itemCount !== undefined && run.itemCount > 0 && (
                  <Text as="span" intent="small" color="accent" className="ml-2">
                    ({run.itemCount} found)
                  </Text>
                )}
              </Text>
            </div>
          )}

          <progress
            value={run.phase ? run.phase.step : 1}
            max={run.phase ? run.phase.total : 4}
            className="h-1 w-full overflow-hidden rounded-full bg-muted accent-accent"
          />

          {run.statusMessage && (
            <Text as="p" intent="fine" color="mutedForeground">
              {run.statusMessage}
            </Text>
          )}
        </div>
      )}

      {expanded && (
        <div className="max-h-64 overflow-y-auto border-t border-border">
          {loadingData ? (
            <div className="px-4 py-5 text-center">
              <Text as="p" intent="small" color="mutedForeground">
                Loading data...
              </Text>
            </div>
          ) : conversations.length > 0 ? (
            conversations.map((conv, index) => (
              <div
                key={conv.id || `${run.id}-${index}`}
                className={cn(
                  "space-y-1 px-4 py-2",
                  index % 2 === 0 ? "bg-muted/50" : "bg-background"
                )}
              >
                <Text as="div" intent="small" weight="medium" truncate>
                  {conv.title}
                </Text>
                <Text as="div" intent="fine" color="mutedForeground" truncate>
                  {conv.url}
                </Text>
              </div>
            ))
          ) : (
            <div className="px-4 py-5 text-center">
              <Text as="p" intent="small" color="mutedForeground">
                No conversation data available
              </Text>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
