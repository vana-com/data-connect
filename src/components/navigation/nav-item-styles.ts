import { cn } from "@/lib/classes"

// Shared interaction contract for navigation items across surfaces.
const navItemInteractiveStateClasses = cn(
  // Inactive: transparent + dim text/icon
  "bg-transparent text-foreground-muted",
  // Hover: subtle emphasis while inactive
  "hover:bg-foreground/[0.03] hover:text-foreground",
  // Active: stronger filled state
  "aria-[current=page]:bg-foreground/[0.07] aria-[current=page]:text-foreground",
  "aria-[current=page]:hover:bg-foreground/[0.07]"
)

export const topNavItemClassName = cn(
  // layout & shape
  "flex h-8 items-center justify-center",
  "rounded-button px-4.5",
  // transitions
  "transition-all duration-150 ease-in-out",
  navItemInteractiveStateClasses
)

export const settingsSidebarItemClassName = cn(
  // layout & shape
  "h-9 w-full justify-start gap-3 rounded-button px-3",
  // typography
  "text-small",
  // icon sizing
  "[&_svg]:text-current",
  "[&_svg:not([class*='size-'])]:size-[1.2em]",
  navItemInteractiveStateClasses
)
