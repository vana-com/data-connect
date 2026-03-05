import { useEffect, useState } from "react"
import { CopyIcon } from "lucide-react"
import { Text } from "@/components/typography/text"
import { Row, tooltipStyle } from "./row"
import { cn } from "@/lib/classes"

/*
  PublicEndpointRow job:
  - Show whether a public URL exists for this Personal Server.
  - If available, show the URL and provide a copy action.

  Why label popover exists:
  - "Public endpoint" can be unclear; this explains what the URL is for.
*/
type PublicEndpointState = "available" | "unavailable"

interface PublicEndpointRowProps {
  tunnelUrl: string | null
  copied: boolean
  onCopy: (url: string) => Promise<boolean>
}

function getPublicEndpointState(tunnelUrl: string | null): PublicEndpointState {
  return tunnelUrl ? "available" : "unavailable"
}

export function PublicEndpointRow({
  tunnelUrl,
  copied,
  onCopy,
}: PublicEndpointRowProps) {
  const [localCopied, setLocalCopied] = useState(false)
  const state = getPublicEndpointState(tunnelUrl)
  const showCopiedFeedback = copied || localCopied

  useEffect(() => {
    if (!localCopied) return
    const timeoutId = window.setTimeout(() => setLocalCopied(false), 1200)
    return () => window.clearTimeout(timeoutId)
  }, [localCopied])

  const handleCopyClick = async () => {
    if (!tunnelUrl) return
    const didCopy = await onCopy(tunnelUrl)
    if (!didCopy) return
    setLocalCopied(true)
  }

  if (state === "unavailable") {
    return (
      <Row
        label="Public endpoint"
        labelInfo="Public URL that routes requests to your Personal Server. If unavailable, the server is not currently reachable from outside your device."
        value={
          <Text as="div" intent="small" dim>
            Not available yet
          </Text>
        }
      />
    )
  }

  return (
    <Row
      label="Public endpoint"
      labelInfo="Public URL that routes requests to your Personal Server. If unavailable, the server is not currently reachable from outside your device."
      value={
        <div className="relative min-w-0">
          {showCopiedFeedback ? (
            <div
              role="status"
              aria-live="polite"
              className={cn(
                "pointer-events-none absolute -top-9 right-0 overflow-hidden  shadow-md z-50 animate-in fade-in-0 zoom-in-95",
                tooltipStyle
              )}
            >
              Copied to clipboard
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => void handleCopyClick()}
            className={cn(
              "group",
              "inline-flex min-w-0 items-center gap-1.5",
              "rounded-soft pl-2 pr-1 py-1",
              "-mr-1",
              "text-foreground-dim",
              "hover:bg-foreground/[0.031] hover:text-foreground"
            )}
          >
            <span className="shrink-0">
              <CopyIcon
                aria-hidden="true"
                className="size-[0.8em] text-small group-hover:text-foreground"
              />
            </span>
            <span className="sr-only">
              {showCopiedFeedback ? "Copied" : "Copy URL"}
            </span>
            <Text
              as="span"
              intent="small"
              dim
              className="max-w-[240px] truncate sm:max-w-[320px] group-hover:text-foreground"
              title={tunnelUrl ?? undefined}
            >
              {tunnelUrl}
            </Text>
          </button>
        </div>
      }
    />
  )
}
