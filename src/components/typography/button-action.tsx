import type { ComponentProps } from "react"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/classes"

type ActionButtonProps = ComponentProps<typeof Button>

export function ActionButton({
  className,
  children,
  variant = "outline",
  size = "xl",
  fullWidth = true,
  type = "button",
  ...props
}: ActionButtonProps) {
  return (
    <Button
      type={type}
      variant={variant}
      size={size}
      fullWidth={fullWidth}
      className={cn(
        // Base layout spacing
        "px-4",
        // Hover treatment
        "hover:border-black hover:ring-4 hover:ring-accent/[0.07]",
        // Focus-visible treatment
        "focus-visible:border-black focus-visible:ring-4 focus-visible:ring-accent/[0.07] focus-visible:ring-offset-0",
        className
      )}
      {...props}
    >
      {children}
    </Button>
  )
}

type ActionPanelProps = ComponentProps<"div"> &
  Pick<ActionButtonProps, "fullWidth" | "size" | "variant">

export function ActionPanel({
  className,
  children,
  variant = "outline",
  size = "xl",
  fullWidth = true,
  ...props
}: ActionPanelProps) {
  return (
    <div
      className={cn(
        buttonVariants({ variant, size, fullWidth }),
        // Base panel surface
        "cursor-default px-4 transition-none",
        // Hover + active overrides (no visual interaction)
        "hover:border-ring/20 hover:ring-0",
        "active:border-ring/20 active:ring-0",
        // Data/ARIA state overrides (no visual interaction)
        "data-[state=open]:border-ring/20 data-[state=open]:ring-0",
        "aria-pressed:border-ring/20 aria-pressed:ring-0",
        "aria-selected:border-ring/20 aria-selected:ring-0",
        // Focus override (no visual interaction)
        "focus-visible:ring-0",
        "focus-visible:ring-offset-0",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
