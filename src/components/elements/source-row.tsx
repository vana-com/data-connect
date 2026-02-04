import { ArrowRight, ChevronRight } from "lucide-react"
import { PlatformIcon } from "@/components/icons/platform-icon"
import { Text } from "@/components/typography/text"
import { cn } from "@/lib/classes"

export interface SourceRowProps {
  iconName: string
  label: string
  meta?: string
  showArrow?: boolean
  iconClassName?: string
  labelColor?: "foreground" | "mutedForeground"
  metaColor?: "foreground" | "mutedForeground"
  arrowClassName?: string
}

export function SourceRow({
  iconName,
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
      <div className="h-full flex-1 flex items-center gap-1.5">
        <PlatformIcon
          iconName={iconName}
          size={30}
          className={cn(iconClassName)}
        />
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
  iconName,
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
        <PlatformIcon
          iconName={iconName}
          size={30}
          className={cn(iconClassName)}
        />
        <Text as="span" intent="button" weight="medium" color={labelColor}>
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
