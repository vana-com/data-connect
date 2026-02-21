import { useEffect, useState } from "react"
import { CopyIcon } from "lucide-react"
import { Text } from "@/components/typography/text"
import type { TextProps } from "@/components/typography/text"
import { copyTextToClipboard } from "@/lib/clipboard"
import { cn } from "@/lib/classes"

/*
  Description-level value renderer for Settings rows.
  Use it in SettingsRow.description (or any SettingsDetailRow value slot)
  when the displayed string should be copyable with subtle hover affordance.
*/
interface SettingsRowDescriptionCopyProps {
  value: string | null
  emptyLabel?: string
  copyLabel?: string
  copiedLabel?: string
  intent?: TextProps<"span">["intent"]
  iconPosition?: "before" | "after"
  title?: string
  className?: string
}

export function SettingsRowDescriptionCopy({
  value,
  emptyLabel = "Not available yet",
  copyLabel = "Copy value",
  copiedLabel = "Copied to clipboard",
  intent = "fine",
  iconPosition = "before",
  title,
  className,
}: SettingsRowDescriptionCopyProps) {
  const [copied, setCopied] = useState(false)
  const gapClassName = intent === "fine" ? "gap-[5px]" : "gap-1.5"

  useEffect(() => {
    if (!copied) return
    const timeoutId = window.setTimeout(() => setCopied(false), 1200)
    return () => window.clearTimeout(timeoutId)
  }, [copied])

  const handleCopyClick = async () => {
    if (!value) return
    const didCopy = await copyTextToClipboard(value)
    if (!didCopy) return
    setCopied(true)
  }

  if (!value) {
    return (
      <Text as="span" intent={intent} dim>
        {emptyLabel}
      </Text>
    )
  }

  return (
    <div className={cn("relative min-w-0", className)}>
      {copied ? (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            "pointer-events-none absolute -top-9 right-0 z-50 overflow-hidden",
            "px-2 py-1 rounded-button text-xs",
            "bg-foreground text-muted",
            "animate-in fade-in-0 zoom-in-95"
          )}
        >
          {copiedLabel}
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => void handleCopyClick()}
        className={cn(
          "group",
          "inline-flex min-w-0 items-center",
          gapClassName,
          "rounded-soft py-1",
          iconPosition === "before" ? "-mr-1 pl-2 pr-1" : "-ml-1 pr-2 pl-1",
          "text-foreground-dim",
          "hover:bg-foreground/3 hover:text-foreground"
        )}
      >
        {iconPosition === "before" ? (
          <span className="shrink-0">
            <CopyIcon
              aria-hidden="true"
              className="size-[0.9em] text-small group-hover:text-foreground"
            />
          </span>
        ) : null}
        <span className="sr-only">{copied ? "Copied" : copyLabel}</span>
        <Text
          as="span"
          intent={intent}
          dim
          truncate
          className="w-auto max-w-[240px] sm:max-w-[320px] group-hover:text-foreground"
          title={title ?? value}
        >
          {value}
        </Text>
        {iconPosition === "after" ? (
          <span className="shrink-0">
            <CopyIcon
              aria-hidden="true"
              className="size-[0.9em] text-small group-hover:text-foreground"
            />
          </span>
        ) : null}
      </button>
    </div>
  )
}
