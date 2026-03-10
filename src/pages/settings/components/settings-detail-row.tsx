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
  className?: string
  ruleClassName?: string
}

/**
 * Variation of `SettingsRow` for compact label/value detail lines.
 */
export function SettingsDetailRow({
  label,
  value,
  isLast = false,
  labelInfo,
  className,
  ruleClassName,
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
      data-slot="settings-detail-row"
      className={cn(
        "flex items-center justify-between gap-4 py-4 h-tab",
        "relative",
        className
      )}
    >
      {isLast ? (
        <div className={cn("absolute top-0 inset-x-0", ruleClassName)}>
          <hr />
        </div>
      ) : null}
      <div className="shrink-0 flex items-center gap-1.5">
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
      <div className="min-w-0 flex flex-1 justify-end">{value}</div>
    </div>
  )
}
