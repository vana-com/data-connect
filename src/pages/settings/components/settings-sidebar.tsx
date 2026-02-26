import type { ReactNode } from "react"
import { settingsSidebarItemClassName } from "@/components/navigation/nav-item-styles"
import {
  compactNavTooltipClassName,
  compactNavTooltipSide,
} from "@/components/navigation/nav-tooltip"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { SettingsSection } from "../types"

interface SettingsLayoutSidebarItem {
  key: SettingsSection
  label: string
  icon: ReactNode
}

interface SettingsLayoutSidebarProps {
  items: SettingsLayoutSidebarItem[]
  activeSection: SettingsSection
  onSectionChange: (section: SettingsSection) => void
}

export function SettingsLayoutSidebar({
  items,
  activeSection,
  onSectionChange,
}: SettingsLayoutSidebarProps) {
  return (
    <aside className="pt-w16">
      <nav className="sticky top-6 space-y-0.5 pt-1">
        {items.map(section => (
          <Tooltip key={section.key}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                onClick={() => onSectionChange(section.key)}
                aria-current={
                  activeSection === section.key ? "page" : undefined
                }
                className={settingsSidebarItemClassName}
              >
                {section.icon}
                <span className="hidden md:inline">{section.label}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side={compactNavTooltipSide}
              className={compactNavTooltipClassName}
            >
              {section.label}
            </TooltipContent>
          </Tooltip>
        ))}
      </nav>
    </aside>
  )
}
