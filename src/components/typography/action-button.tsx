import type { ComponentProps } from "react"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/classes"

type ActionButtonProps = ComponentProps<"button">

export function ActionButton({ className, children, ...props }: ActionButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      fullWidth
      className={cn("px-4", className)}
      {...props}
    >
      {children}
    </Button>
  )
}

type ActionPanelProps = ComponentProps<"div">

export function ActionPanel({ className, children, ...props }: ActionPanelProps) {
  return (
    <div
      className={cn(
        buttonVariants({ variant: "outline", size: "lg", fullWidth: true }),
        "bg-background/40 px-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
