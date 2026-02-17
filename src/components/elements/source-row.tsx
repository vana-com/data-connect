import type { ReactNode } from "react"
import { ChevronRightIcon } from "lucide-react"
import { PlatformIcon } from "@/components/icons/platform-icon"
import { Text } from "@/components/typography/text"
import { cn } from "@/lib/classes"
import { fieldHeight } from "../typography/field"

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

export interface SourceStackProps extends SourceRowProps {
  stackPrimaryColor?: string
  trailingSlot?: ReactNode
  bottomClassName?: string
}

export const sourceRowActionStyle =
  "text-foreground/30 group-hover:text-foreground"

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
      <div className="h-full flex-1 flex items-center gap-3">
        <PlatformIcon iconName={iconName} className={cn(iconClassName)} />
        <div className="flex items-baseline gap-2">
          {label}

          {meta ? (
            <Text as="span" intent="small" color={metaColor}>
              {meta}
            </Text>
          ) : null}
        </div>
      </div>

      {/* RHS */}
      {shouldRenderMetaSection ? (
        <div className="h-full flex items-center gap-3">
          {/* CTA icon */}
          {shouldShowArrow ? (
            <ChevronRightIcon
              className={cn(sourceRowActionStyle, "size-7", arrowClassName)}
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
  stackPrimaryColor,
  trailingSlot,
  bottomClassName,
}: SourceStackProps) {
  const shouldShowArrow = showArrow ?? Boolean(meta)
  const shouldRenderMetaSection =
    shouldShowArrow || Boolean(meta) || Boolean(trailingSlot)

  return (
    <div className="w-full">
      <div
        className="h-[90px] flex items-start border-b"
        style={
          stackPrimaryColor
            ? {
                backgroundImage: `linear-gradient(30deg, color-mix(in srgb, ${stackPrimaryColor} 9%, transparent) 0%, color-mix(in srgb, ${stackPrimaryColor} 3%, transparent) 55%, transparent 100%)`,
              }
            : undefined
        }
      >
        <div className="p-2">
          <PlatformIcon
            iconName={iconName}
            size={24}
            className={cn("p-3", iconClassName)}
          />
        </div>
      </div>

      {/* Bottom */}
      <div
        className={cn(
          "flex items-center justify-between",
          fieldHeight.default,
          "px-4",
          bottomClassName
        )}
      >
        <Text as="span" intent="button" weight="medium" color={labelColor}>
          {label}
        </Text>
        {shouldRenderMetaSection ? (
          <div className="flex items-center gap-2 self-end h-full">
            {meta ? (
              <Text as="span" intent="small" color={metaColor}>
                {meta}
              </Text>
            ) : null}

            {trailingSlot}

            {/* CTA icon */}
            {shouldShowArrow ? (
              <ChevronRightIcon
                className={cn(sourceRowActionStyle, "size-5", arrowClassName)}
                aria-hidden
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
