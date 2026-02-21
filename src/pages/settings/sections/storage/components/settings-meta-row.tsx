import { isValidElement, type ReactNode } from "react"
import { Text } from "@/components/typography/text"
import { cn } from "@/lib/classes"

/*
  Storage-local variant based on shared SettingsRow patterns.
  Reference source: src/pages/settings/components/settings-row.tsx (SettingsRow).
*/
interface SettingsMetaRowProps {
  title: ReactNode
  description?: ReactNode
  badge?: ReactNode
  className?: string
}

export function SettingsMetaRow({
  title,
  description,
  badge,
  className,
}: SettingsMetaRowProps) {
  const titleContent =
    typeof title === "string" ? (
      <Text as="div" intent="body" weight="semi">
        {title}
      </Text>
    ) : (
      title
    )

  const descriptionContent =
    description == null ? null : isValidElement(description) &&
      description.type === Text ? (
      description
    ) : (
      <Text as="div" intent="small" dim>
        {description}
      </Text>
    )

  return (
    <div
      data-component="settings-meta-row"
      className={cn(
        "flex items-start justify-between gap-4 px-4 py-3",
        className
      )}
    >
      <div className={cn("flex-1", descriptionContent && "space-y-0.5")}>
        {titleContent}
        {descriptionContent}
      </div>
      {badge}
    </div>
  )
}
