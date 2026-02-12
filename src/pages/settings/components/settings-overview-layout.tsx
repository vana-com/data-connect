import type { ReactNode } from "react"
import { cn } from "@/lib/classes"

interface SettingsOverviewLayoutProps {
  sidebar: ReactNode
  content: ReactNode
}

export function SettingsOverviewLayout({
  sidebar,
  content,
}: SettingsOverviewLayoutProps) {
  return (
    <div
      data-component="settings-overview"
      className={cn(
        "h-full w-full flex-1",
        // padding
        "pt-w16 px-inset pb-inset"
      )}
    >
      <section
        className={cn(
          "grid w-full items-start gap-submajor",
          // < 768px: compact icon rail (12 + 16 + 12 = 40px) + flexible content column
          "grid-cols-[40px_minmax(0,500px)]",
          // >= 768px: restore full sidebar rail + same flexible content column
          "md:grid-cols-[210px_minmax(0,500px)]",
          // >= 1100px: render content only here, centered, while fixed sidebar is rendered below
          "min-[1100px]:grid-cols-[minmax(0,500px)] min-[1100px]:justify-center"
        )}
      >
        <div className="min-[1100px]:hidden">{sidebar}</div>
        <div className="w-full max-w-[500px]">{content}</div>
      </section>

      {/* > 1100px wide   */}
      <section className="hidden w-full min-[1100px]:block">
        <div
          className={cn(
            "fixed top-[calc(76px+var(--spacing-w16))] w-[210px]",
            "left-[calc((100vw-500px)/2-210px-var(--spacing-submajor,24px))]"
          )}
        >
          {sidebar}
        </div>
      </section>
    </div>
  )
}
