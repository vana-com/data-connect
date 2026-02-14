import { useEffect, useMemo, useState } from "react"
import { CopyIcon } from "lucide-react"
import { Text } from "@/components/typography/text"
import { copyTextToClipboard } from "@/lib/clipboard"
import { cn } from "@/lib/classes"
import { Row, tooltipStyle } from "./row"

interface EndpointRowProps {
  tunnelUrl: string | null
  port: number | null
}

type PublicEndpointState = "available" | "unavailable"

/*
  Local UI test toggle:
  - null: use real endpoint state
  - "available": force endpoint preview
  - "unavailable": force unavailable preview
*/
const TEST_PUBLIC_ENDPOINT_STATE: PublicEndpointState | null = "available"
const TEST_PUBLIC_ENDPOINT_URL = "https://abc123.server.vana.org"
const TEST_PUBLIC_ENDPOINT_COPIED = false

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

export function EndpointRow({ tunnelUrl, port }: EndpointRowProps) {
  const [copied, setCopied] = useState(false)
  const endpoint = useMemo(
    () => getResolvedEndpoint(tunnelUrl, port),
    [tunnelUrl, port]
  )
  const showCopiedFeedback = copied || TEST_PUBLIC_ENDPOINT_COPIED

  useEffect(() => {
    if (!copied) return
    const timeoutId = window.setTimeout(() => setCopied(false), 1200)
    return () => window.clearTimeout(timeoutId)
  }, [copied])

  const handleCopyClick = async () => {
    if (!endpoint) return
    const didCopy = await copyTextToClipboard(endpoint)
    if (!didCopy) return
    setCopied(true)
  }

  if (!endpoint) {
    return (
      <Row
        label="Public endpoint"
        isLast
        labelInfo="Public URL that routes requests to your Personal Server."
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
      isLast
      labelInfo="Public URL that routes requests to your Personal Server."
      value={
        <div className="relative min-w-0">
          {showCopiedFeedback ? (
            <div
              role="status"
              aria-live="polite"
              className={cn(
                "pointer-events-none absolute -top-9 right-0 overflow-hidden shadow-md z-50 animate-in fade-in-0 zoom-in-95",
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
              title={endpoint}
            >
              {endpoint}
            </Text>
          </button>
        </div>
      }
    />
  )
}
