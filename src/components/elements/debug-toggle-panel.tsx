import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Text } from "@/components/typography/text"

interface DebugTogglePanelProps {
  title: string
  children: React.ReactNode
}

export function DebugTogglePanel({ title, children }: DebugTogglePanelProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="rounded-card bg-background">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex w-full items-center justify-between gap-4 px-3 py-2"
        >
          <Text intent="small" weight="medium">
            {title}
          </Text>
          {open ? (
            <ChevronUp size={14} className="text-muted-foreground" />
          ) : (
            <ChevronDown size={14} className="text-muted-foreground" />
          )}
        </button>
        {open && <div className="px-3 py-2">{children}</div>}
      </div>
    </div>
  )
}
