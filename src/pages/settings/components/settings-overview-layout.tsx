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
        "flex h-full w-full flex-1",
        "pt-w16 px-inset pb-inset",
        "lg:justify-center"
      )}
    >
      <section className="grid w-full items-start gap-submajor lg:w-fit lg:grid-cols-[210px_500px]">
        {sidebar}
        {content}
      </section>
    </div>
  )
}
