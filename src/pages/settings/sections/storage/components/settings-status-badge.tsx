import type { ReactNode } from "react"
import { Text } from "@/components/typography/text"
import { cn } from "@/lib/classes"

interface SettingsStatusBadgeProps {
  label?: ReactNode
  className?: string
}

function SettingsStatusBadge({
  label,
  textClassName,
  dotClassName,
  className,
}: {
  label: ReactNode
  textClassName?: string
  dotClassName?: string
  className?: string
}) {
  return (
    <Text
      as="div"
      intent="compact"
      withIcon
      className={cn("gap-1", textClassName, className)}
      data-component="settings-status-badge"
    >
      <span className={cn("size-[0.5em] rounded-full", dotClassName)} />
      {label}
    </Text>
  )
}

export function SettingsBadgeActive({
  label = "Active",
  className,
}: SettingsStatusBadgeProps) {
  return (
    <SettingsStatusBadge
      label={label}
      textClassName="text-success-foreground"
      dotClassName="bg-success-foreground"
      className={className}
    />
  )
}

export function SettingsBadgeNone({
  label = "None",
  className,
}: SettingsStatusBadgeProps) {
  return (
    <SettingsStatusBadge
      label={label}
      textClassName="text-stonebeige"
      dotClassName="bg-stonebeige"
      className={className}
    />
  )
}
