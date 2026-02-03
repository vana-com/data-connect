import { Button } from "@/components/ui/button"
import { cn } from "@/lib/classes"
import type { TabKey } from "../types"

interface YourDataTabsProps {
  activeTab: TabKey
  onTabChange: (tab: TabKey) => void
}

export function YourDataTabs({ activeTab, onTabChange }: YourDataTabsProps) {
  const tabs: { key: TabKey; label: string }[] = [
    { key: "sources", label: "Your data" },
    { key: "apps", label: "Connected apps" },
  ]

  return (
    <div className="inline-flex rounded-button bg-muted p-1">
      {tabs.map(tab => (
        <Button
          key={tab.key}
          type="button"
          variant={activeTab === tab.key ? "default" : "ghost"}
          size="sm"
          onClick={() => onTabChange(tab.key)}
          className={cn(
            "rounded-button px-4",
            activeTab !== tab.key && "text-muted-foreground"
          )}
        >
          {tab.label}
        </Button>
      ))}
    </div>
  )
}
