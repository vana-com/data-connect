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
      {/* 1) Layout mode switch:
          - <1100px: this container behaves as a grid (sidebar + content in flow)
          - >=1100px: this same container becomes flex and centers the content column */}
      <section
        className={cn(
          "grid w-full items-start gap-submajor min-[1100px]:flex min-[1100px]:justify-center",
          // Shared constants used by both the content width and desktop sidebar offset math.
          "[--settings-content-max:var(--spacing-panel-width)] [--settings-sidebar-width:210px]",
          // < 768px: compact icon rail (12 + 16 + 12 = 40px) + flexible content column
          "grid-cols-[40px_minmax(0,var(--spacing-panel-width))]",
          // >= 768px: restore full sidebar rail + same flexible content column
          "md:grid-cols-[210px_minmax(0,var(--spacing-panel-width))]"
        )}
      >
        {/* 2) Sidebar behavior:
            - <1100px: in normal document flow as the first grid column
            - >=1100px: switches to fixed positioning while content is centered by flex
            - left calc anchors to the centered panel-width content column:
              centered-content-left - sidebar-width - inter-column-gap */}
        <div
          className={cn(
            // <1100px: sidebar stays in grid flow.
            "w-full md:w-[210px]",
            // >=1100px: pin sidebar below the header.
            "min-[1100px]:fixed min-[1100px]:top-[calc(76px+var(--spacing-w16))]",
            // >=1100px: align sidebar left of centered content; clamp to page inset.
            "min-[1100px]:left-[max(var(--spacing-inset),calc(50vw-var(--settings-content-max)/2-var(--settings-sidebar-width)-var(--spacing-submajor)))]",
            // >=1100px: keep rail width tokenized for offset math.
            "min-[1100px]:w-(--settings-sidebar-width)"
          )}
        >
          {sidebar}
        </div>
        {/* 3) Content column:
            - always constrained to max panel width token
            - centered only in desktop mode because section flips to flex + justify-center */}
        <div className="w-full max-w-panel-width">{content}</div>
      </section>
    </div>
  )
}
