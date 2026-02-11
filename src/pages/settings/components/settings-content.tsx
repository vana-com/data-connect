import type { ReactNode } from "react"
import { Text } from "@/components/typography/text"

interface SettingsContentProps {
  title: string
  description?: string
  children: ReactNode
}

export function SettingsContent({
  title,
  description,
  children,
}: SettingsContentProps) {
  return (
    <section className="space-y-8">
      <header className="space-y-3">
        <Text as="h1" intent="subtitle" weight="medium">
          {title}
        </Text>
        {description && (
          <Text as="p" intent="small" color="mutedForeground">
            {description}
          </Text>
        )}
      </header>
      {children}
    </section>
  )
}
