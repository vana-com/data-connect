import type { ReactNode } from "react"
import { InfoIcon } from "lucide-react"
import { Text } from "@/components/typography/text"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/classes"
import { settingsRowDescriptionTooltipStyle } from "./settings-row-description-shared"

interface SettingsDetailRowProps {
  label: ReactNode
  value: ReactNode
  isLast?: boolean
  labelInfo?: ReactNode
}

/**
 * Variation of `SettingsRow` for compact label/value detail lines.
 */
export function SettingsDetailRow({
  label,
  value,
  isLast = false,
  labelInfo,
}: SettingsDetailRowProps) {
  const labelContent =
    typeof label === "string" ? (
      <Text as="div" intent="body" weight="semi">
        {label}
      </Text>
    ) : (
      label
    )

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 py-4",
        !isLast && "border-b border-border"
      )}
    >
      <div className="flex items-center gap-1.5">
        {labelContent}
        {labelInfo ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="More info"
                className="inline-flex size-3.5 items-center justify-center text-foreground-muted hover:text-foreground"
              >
                <InfoIcon aria-hidden="true" className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className={cn(
                "max-w-[280px]",
                settingsRowDescriptionTooltipStyle
              )}
            >
              {labelInfo}
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>
      {value}
    </div>
  )
}
