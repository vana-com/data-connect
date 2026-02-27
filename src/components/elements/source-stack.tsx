import type { ReactNode } from "react"
import { ChevronRightIcon } from "lucide-react"
import { PlatformIcon } from "@/components/icons/platform-icon"
import { Text } from "@/components/typography/text"
import { cn } from "@/lib/classes"
import { fieldHeight } from "../typography/field"
import { sourceRowActionStyle } from "./source-row"

export interface SourceStackProps {
  iconName: string
  iconImageSrc?: string
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
  iconImageSrc,
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
      <div className="h-[96px] flex items-start border-b">
        <div className="p-2">
          <PlatformIcon
            iconName={iconName}
            imageSrc={iconImageSrc}
            size={24}
            className={cn("p-3", iconClassName)}
          />
        </div>
        <div className="min-w-0 flex-1 p-2.5">{infoSlot}</div>
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
