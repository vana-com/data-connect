import type { ReactNode } from "react"
import { ChevronRightIcon } from "lucide-react"
import { actionButtonSurfaceClass } from "@/components/typography/button-action"
import { fieldHeight } from "@/components/typography/field"
import { Text } from "@/components/typography/text"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/classes"

type AppCardProps = {
  children: ReactNode
  footerLabel: string
  ariaLabel?: string
  onClick?: () => void
  interactive?: boolean
  className?: string
}

export function AppCard({
  children,
  footerLabel,
  ariaLabel,
  onClick,
  interactive = true,
  className,
}: AppCardProps) {
  const cardClassName = cn(
    buttonVariants({
      variant: "outline",
      size: "xl",
      fullWidth: true,
    }),
    "min-h-[220px] min-w-0 whitespace-normal p-0! items-start!",
    interactive
      ? actionButtonSurfaceClass
      : "bg-background/30! hover:border-ring/20 cursor-default p-0 transition-none",
    className
  )

  const cardContent = (
    <div className="w-full h-full flex-1 flex flex-col">
      <div className="p-4">{children}</div>
      <div className="mt-auto">
        <div
          className={cn(
            "flex w-full items-center justify-between border-t text-left",
            fieldHeight.default,
            "px-4"
          )}
        >
          <Text
            as="span"
            intent="button"
            weight="medium"
            truncate
            align="left"
          >
            {footerLabel}
          </Text>
          <div className="flex items-center gap-2 self-end h-full">
            <ChevronRightIcon
              className="size-5 text-foreground-muted"
              aria-hidden
            />
          </div>
        </div>
      </div>
    </div>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        className={cn(cardClassName, "text-left")}
      >
        {cardContent}
      </button>
    )
  }

  return <div className={cardClassName}>{cardContent}</div>
}
