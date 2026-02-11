import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/classes"
import type { SettingsSection } from "../types"

interface SettingsSidebarItem {
  key: SettingsSection
  label: string
  icon: ReactNode
}

interface SettingsSidebarProps {
  items: SettingsSidebarItem[]
  activeSection: SettingsSection
  onSectionChange: (section: SettingsSection) => void
}

const settingsNavButtonClassName = cn(
  "h-9 w-full justify-start gap-3 rounded-button px-3",
  "text-small",
  "[&_svg]:text-current",
  "[&_svg:not([class*='size-'])]:size-[1.2em]",
  // Inactive: transparent + dim text/icon
  "bg-transparent text-foreground-muted",
  "hover:bg-foreground/[0.031] hover:text-foreground",
  // Active: filled row + foreground text/icon
  "aria-[current=page]:bg-foreground/[0.07] aria-[current=page]:text-foreground",
  "aria-[current=page]:hover:bg-foreground/[0.07]"
)

export function SettingsSidebar({
  items,
  activeSection,
  onSectionChange,
}: SettingsSidebarProps) {
  return (
    <aside className="pt-w16">
      <nav className="sticky top-6 space-y-0.5 pt-1">
        {items.map(section => (
          <Button
            key={section.key}
            type="button"
            variant="ghost"
            onClick={() => onSectionChange(section.key)}
            aria-current={activeSection === section.key ? "page" : undefined}
            className={settingsNavButtonClassName}
          >
            {section.icon}
            {section.label}
          </Button>
        ))}
      </nav>
    </aside>
  )
}
