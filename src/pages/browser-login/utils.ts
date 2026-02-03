import { cn } from "@/lib/classes"

export const inputClassName = cn(
  // layout
  "w-full rounded-button border border-input bg-background px-3 py-2",
  // typography
  "text-body text-foreground placeholder:text-muted-foreground",
  // focus
  "outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
  "focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  // disabled
  "disabled:cursor-not-allowed disabled:opacity-50"
)
