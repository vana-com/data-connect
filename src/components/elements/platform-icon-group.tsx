import type { ComponentProps } from "react"
import { PlatformIcon } from "@/components/icons/platform-icon"
import { cn } from "@/lib/classes"

export interface PlatformIconGroupItem {
  iconName: string
  imageSrc?: string
  fallbackLabel?: string
}

interface PlatformIconGroupProps extends Omit<
  ComponentProps<"div">,
  "children"
> {
  items: PlatformIconGroupItem[]
  size?: number
  maxVisible?: number
}

export function PlatformIconGroup({
  items,
  size = 28,
  maxVisible = 3,
  className,
  ...props
}: PlatformIconGroupProps) {
  const visibleItems = items.slice(0, maxVisible)
  const overflowCount = items.length - visibleItems.length
  const visibleSlicePx = Math.max(10, Math.round(size * 0.9))
  const overlapPx = size - visibleSlicePx
  const overflowFontSizePx = Math.max(11, Math.round(size * 0.45))

  return (
    <div
      data-slot="platform-icon-group"
      className={cn("flex items-center", className)}
      {...props}
    >
      {visibleItems.map((item, index) => (
        <PlatformIcon
          key={`${item.iconName}-${index}`}
          iconName={item.iconName}
          imageSrc={item.imageSrc}
          fallbackLabel={item.fallbackLabel}
          size={size}
          variant="plain"
          className="shrink-0 ring-2 ring-background"
          style={{
            marginLeft: index > 0 ? `${-overlapPx}px` : undefined,
            zIndex: visibleItems.length - index,
          }}
          aria-hidden="true"
        />
      ))}
      {overflowCount > 0 ? (
        <div
          className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-button border bg-background font-medium text-foreground-muted ring-2 ring-background"
          style={{
            width: `${size}px`,
            height: `${size}px`,
            marginLeft: `${-overlapPx}px`,
            zIndex: 0,
            fontSize: `${overflowFontSizePx}px`,
          }}
          aria-hidden="true"
        >
          +{overflowCount}
        </div>
      ) : null}
    </div>
  )
}
