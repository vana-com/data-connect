import type { ReactNode } from "react"
import { cn } from "@/lib/classes"

interface SourceOverviewLayoutProps {
  sidebar: ReactNode
  content: ReactNode
}

export function SourceOverviewLayout({
  sidebar,
  content,
}: SourceOverviewLayoutProps) {
  return (
    <div
      data-component="source-overview"
      className={cn(
        "flex flex-1 w-full h-full",
        "pt-w16 px-inset pb-inset",
        // condense the width
        "lg:px-w24"
      )}
    >
      <section className="w-full grid gap-small lg:grid-cols-[250px_minmax(0,1fr)]">
        {sidebar}
        {content}
      </section>
    </div>
  )
}
