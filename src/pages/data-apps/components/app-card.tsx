import { actionButtonSurfaceClass } from "@/components/typography/button-action"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/classes"
import { ArrowUpRightIcon } from "lucide-react"
import type { ReactNode } from "react"

type AppCardProps = {
  children: ReactNode
  ariaLabel?: string
  onClick?: () => void
  interactive?: boolean
  className?: string
}

export function AppCard({
  children,
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
    "group min-h-[220px] min-w-0 whitespace-normal p-0! items-start!",
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
            // border-t
            "flex w-full items-center justify-end text-left",
            // fieldHeight.default,
            "px-3 py-2.5"
          )}
        >
          {interactive ? (
            <div
              className={cn(
                // size-5 + p-1 = 28px
                "p-1 bg-foreground rounded-full opacity-0 translate-y-0.5",
                "transition-[opacity,transform]",
                "group-hover:opacity-100 group-hover:translate-y-0 group-focus-visible:opacity-100 group-focus-visible:translate-y-0"
              )}
            >
              <ArrowUpRightIcon
                className="size-5 text-background"
                aria-hidden
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )

  if (onClick) {
    return (
      <button
        data-slot="app-card"
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
