import type { ReactNode } from "react"
import { settingsSidebarItemClassName } from "@/components/navigation/nav-item-styles"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
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

export function SettingsSidebar({
  items,
  activeSection,
  onSectionChange,
}: SettingsSidebarProps) {
  return (
    <aside className="pt-w16">
      <nav className="sticky top-6 space-y-0.5 pt-1">
        {items.map(section => (
          <Tooltip key={section.key}>
            <TooltipTrigger asChild>
              <Button
                type="button"
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
            <TooltipContent side="right" className="md:hidden">
              {section.label}
            </TooltipContent>
          </Tooltip>
        ))}
      </nav>
    </aside>
  )
}
