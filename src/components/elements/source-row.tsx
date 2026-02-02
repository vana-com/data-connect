import type { ElementType } from "react"
import { ArrowRight } from "lucide-react"
import { Text } from "@/components/typography/text"
import { cn } from "@/lib/classes"

type SourceRowLayout = "row" | "stacked"

interface SourceRowProps {
  layout?: SourceRowLayout
  Icon: ElementType<{ className?: string }>
  label: string
  meta?: string
  showArrow?: boolean
  iconClassName?: string
  labelColor?: "foreground" | "mutedForeground"
  metaColor?: "foreground" | "mutedForeground"
  arrowClassName?: string
}

export function SourceRow({
  layout = "row",
  Icon,
  label,
  meta,
  showArrow,
  iconClassName,
  labelColor = "foreground",
  metaColor = "mutedForeground",
  arrowClassName,
}: SourceRowProps) {
  const isStacked = layout === "stacked"
  const shouldShowArrow = showArrow ?? Boolean(meta)
  const shouldRenderRight = shouldShowArrow || Boolean(meta)

  return (
    <>
      <div
        className={
          isStacked ? "flex flex-col gap-3" : "h-full flex-1 flex items-center gap-3"
        }
      >
        <div className="flex size-6 items-center justify-center rounded-card">
          <Icon className={cn("size-6 grayscale", iconClassName)} aria-hidden />
        </div>
        {isStacked ? (
          <Text as="span" intent="button" color={labelColor}>
            {label}
          </Text>
        ) : (
          <span>{label}</span>
        )}
      </div>

      {/* Bottom or RHS */}
      {shouldRenderRight ? (
        <div
          className={
            isStacked
              ? "flex items-center gap-2 self-end"
              : "h-full flex items-center gap-3"
          }
        >
          {meta ? (
            isStacked ? (
              <Text as="span" intent="small" color={metaColor}>
                {meta}
              </Text>
            ) : (
              <Text as="span" intent="small" weight="medium" color={metaColor}>
                {meta}
              </Text>
            )
          ) : null}
          {shouldShowArrow ? (
            <ArrowRight
              className={cn(isStacked ? "size-5" : "size-6", arrowClassName)}
              aria-hidden
            />
          ) : null}
        </div>
      ) : null}
    </>
  )
}
