import type { ReactNode } from "react"
import { InfoIcon } from "lucide-react"
import { Text } from "@/components/typography/text"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/classes"

/* Duplicate of storage/components/row.tsx */

interface RowProps {
  label: ReactNode
  value: ReactNode
  isLast?: boolean
  labelInfo?: ReactNode
}

interface RowDotProps {
  className?: string
}

export function Row({ label, value, isLast = false, labelInfo }: RowProps) {
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
        // "flex items-center justify-between gap-4 py-2.5",
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
              className={cn("max-w-[280px]", tooltipStyle)}
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

export function RowDot({ className }: RowDotProps) {
  return (
    <span
      aria-hidden="true"
      className={cn("size-[0.5em] rounded-full", className)}
    />
  )
}

export const tooltipStyle = [
  "text-fine bg-background",
  "ring-2 ring-foreground rounded-soft",
  "px-2.5 py-2",
]
