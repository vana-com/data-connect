import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Text } from "@/components/typography/text"
import { cn } from "@/lib/classes"

interface DebugTogglePanelProps {
  title: string
  children: React.ReactNode
  openClassName?: string
}

export function DebugTogglePanel({
  title,
  children,
  openClassName,
}: DebugTogglePanelProps) {
  const [open, setOpen] = useState(false)

  return (
    <div data-slot="debug-toggle-panel" className="fixed bottom-4 right-4 z-50">
      <div
        className={cn(
          "rounded-card bg-background border ring-4",
          open
            ? "ring-ring/50 border-ring"
            : "ring-transparent border-transparent"
        )}
      >
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex w-full items-center justify-between gap-4 px-3 py-2"
        >
          <Text intent="fine" weight="medium">
            {title}
          </Text>
          {open ? (
            <ChevronUp size={14} className="text-muted-foreground" />
          ) : (
            <ChevronDown size={14} className="text-muted-foreground" />
          )}
        </button>
        {open && (
          <div className={cn("px-3 py-2", openClassName)}>{children}</div>
        )}
      </div>
    </div>
  )
}
