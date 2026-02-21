import { cn } from "@/lib/classes"

interface SettingsRowDescriptionDotProps {
  className?: string
}

export function SettingsRowDescriptionDot({
  className,
}: SettingsRowDescriptionDotProps) {
  return (
    <span
      aria-hidden="true"
      className={cn("size-[0.5em] rounded-full", className)}
    />
  )
}

export const settingsRowDescriptionTooltipStyle = [
  "text-fine bg-foreground text-background",
  "ring-2 ring-foreground rounded-soft",
  "px-2.5 py-2",
]
