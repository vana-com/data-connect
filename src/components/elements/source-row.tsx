import type { ElementType } from "react"
import { ArrowRight, ChevronRight } from "lucide-react"
import { Text } from "@/components/typography/text"
import { cn } from "@/lib/classes"

export interface SourceRowProps {
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
  Icon,
  label,
  meta,
  showArrow,
  iconClassName,
  metaColor = "mutedForeground",
  arrowClassName,
}: SourceRowProps) {
  const shouldShowArrow = showArrow ?? Boolean(meta)
  const shouldRenderMetaSection = shouldShowArrow || Boolean(meta)

  return (
    <>
      <div className="h-full flex-1 flex items-center gap-3">
        <div className="flex size-6.5 items-center justify-center rounded-card">
          <Icon className={cn("size-6 grayscale", iconClassName)} aria-hidden />
        </div>
        <div className="flex items-baseline gap-1.5">
          {label}

          {meta ? (
            <Text as="span" intent="small" color={metaColor}>
              {meta}
            </Text>
          ) : null}
        </div>
      </div>

      {/* Bottom or RHS */}
      {shouldRenderMetaSection ? (
        <div className="h-full flex items-center gap-3">
          {/* CTA icon */}
          {shouldShowArrow ? (
            <ChevronRight
              className={cn(
                "size-7 text-foreground/30 group-hover:text-foreground",
                arrowClassName
              )}
              aria-hidden
            />
          ) : null}
        </div>
      ) : null}
    </>
  )
}

export function SourceStack({
  Icon,
  label,
  meta,
  showArrow,
  iconClassName,
  labelColor = "foreground",
  metaColor = "mutedForeground",
  arrowClassName,
}: SourceRowProps) {
  const shouldShowArrow = showArrow ?? Boolean(meta)
  const shouldRenderMetaSection = shouldShowArrow || Boolean(meta)

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex size-6 items-center justify-center rounded-card">
          <Icon className={cn("size-6 grayscale", iconClassName)} aria-hidden />
        </div>
        <Text as="span" intent="button" color={labelColor}>
          {label}
        </Text>
      </div>

      {/* Bottom */}
      {shouldRenderMetaSection ? (
        <div className="flex items-center gap-2 self-end">
          {meta ? (
            <Text as="span" intent="small" color={metaColor}>
              {meta}
            </Text>
          ) : null}

          {/* CTA icon */}
          {shouldShowArrow ? (
            <ArrowRight className={cn("size-5", arrowClassName)} aria-hidden />
          ) : null}
        </div>
      ) : null}
    </>
  )
}
