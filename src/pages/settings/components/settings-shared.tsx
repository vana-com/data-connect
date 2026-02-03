import type { ReactNode } from "react"
import { Text } from "@/components/typography/text"
import { cn } from "@/lib/classes"

interface SettingsSectionProps {
  title: ReactNode
  children: ReactNode
  className?: string
}

export function SettingsSection({ title, children, className }: SettingsSectionProps) {
  return (
    <section className={cn("space-y-3", className)}>
      <Text as="h2" intent="small" weight="medium" color="mutedForeground">
        {title}
      </Text>
      {children}
    </section>
  )
}

interface SettingsCardProps {
  children: ReactNode
  className?: string
  contentClassName?: string
  divided?: boolean
}

export function SettingsCard({
  children,
  className,
  contentClassName,
  divided = false,
}: SettingsCardProps) {
  const content = divided ? (
    <div className={cn("divide-y divide-border", contentClassName)}>{children}</div>
  ) : contentClassName ? (
    <div className={contentClassName}>{children}</div>
  ) : (
    children
  )

  return (
    <div className={cn("rounded-card border border-border bg-background", className)}>
      {content}
    </div>
  )
}

interface SettingsRowProps {
  icon: ReactNode
  iconContainerClassName?: string
  title: ReactNode
  description?: ReactNode
  right?: ReactNode
  className?: string
  contentClassName?: string
}

export function SettingsRow({
  icon,
  iconContainerClassName,
  title,
  description,
  right,
  className,
  contentClassName,
}: SettingsRowProps) {
  return (
    <div className={cn("flex items-center gap-4 p-4", className)}>
      <div
        className={cn(
          "flex size-10 items-center justify-center rounded-button",
          iconContainerClassName
        )}
      >
        {icon}
      </div>
      <div className={cn("flex-1", description && "space-y-1", contentClassName)}>
        {title}
        {description}
      </div>
      {right}
    </div>
  )
}
