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

export interface SourceStackProps {
  iconName: string
  label: string
  showArrow?: boolean
  iconClassName?: string
  labelColor?: "foreground" | "mutedForeground"
  arrowClassName?: string
  stackPrimaryColor?: string
  trailingSlot?: ReactNode
  infoSlot?: ReactNode
  bottomClassName?: string
}

export function SourceStack({
  iconName,
  label,
  showArrow,
  iconClassName,
  labelColor = "foreground",
  arrowClassName,
  stackPrimaryColor,
  trailingSlot,
  infoSlot,
  bottomClassName,
}: SourceStackProps) {
  const shouldShowArrow = Boolean(showArrow)
  void stackPrimaryColor
  // const darkenedStackColor = stackPrimaryColor
  //   ? `color-mix(in srgb, ${stackPrimaryColor} 30%, black)`
  //   : undefined
  // bgColor: `color-mix(in srgb, ${darkenedStackColor} 1%, transparent)`,

  return (
    <div className="w-full">
      <div className="h-[72px] flex items-start border-b">
        <div className="p-2">
          <PlatformIcon
            iconName={iconName}
            size={24}
            className={cn("p-3", iconClassName)}
          />
        </div>
        <div className="flex-1 p-2 text-right">{infoSlot}</div>
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
        <Text
          as="span"
          intent="button"
          weight="medium"
          truncate
          align="left"
          color={labelColor}
        >
          {label}
        </Text>
        <div className="flex items-center gap-2 self-end h-full">
          {trailingSlot}

          {/* CTA icon */}
          {shouldShowArrow ? (
            <ChevronRightIcon
              className={cn(sourceRowActionStyle, "size-5", arrowClassName)}
              aria-hidden
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
