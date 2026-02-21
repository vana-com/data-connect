import {
  Children,
  Fragment,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react"
import { LoadingButton } from "@/components/elements/button-loading"
import { Text } from "@/components/typography/text"
import { cn } from "@/lib/classes"
import { SettingsRowDivider } from "./settings-row-divider"

interface SettingsSectionProps {
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  className?: string
}

export function SettingsSection({
  title,
  description,
  children,
  className,
}: SettingsSectionProps) {
  return (
    <section
      data-component="settings-section"
      className={cn("space-y-gap", className)}
    >
      <div className="space-y-1">
        <Text as="h2" intent="button" weight="medium">
          {title}
        </Text>
        {description && (
          <Text as="p" intent="small" dim>
            {description}
          </Text>
        )}
      </div>
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

interface SettingsCardStackProps {
  children: ReactNode
  className?: string
}

export function SettingsCard({
  children,
  className,
  contentClassName,
  divided = false,
}: SettingsCardProps) {
  const items = divided ? Children.toArray(children) : []
  const content = divided ? (
    <div className={contentClassName}>
      {items.map((child, index) => (
        <Fragment key={index}>
          {child}
          {index < items.length - 1 && <SettingsRowDivider />}
        </Fragment>
      ))}
    </div>
  ) : contentClassName ? (
    <div className={contentClassName}>{children}</div>
  ) : (
    children
  )

  return (
    <div
      data-component="settings-card"
      className={cn(
        "rounded-card ring ring-border/30 bg-background",
        className
      )}
    >
      {content}
    </div>
  )
}

export function SettingsCardStack({
  children,
  className,
}: SettingsCardStackProps) {
  return (
    <div
      data-component="settings-card-stack"
      className={cn("form-outset space-y-3", className)}
    >
      {children}
    </div>
  )
}

interface SettingsStatusBadgeProps {
  label?: ReactNode
  className?: string
}

type SettingsRowActionProps = ComponentPropsWithoutRef<typeof LoadingButton>

export function SettingsRowAction({
  variant = "ghost",
  size = "sm",
  type = "button",
  ...props
}: SettingsRowActionProps) {
  return (
    <LoadingButton
      variant={variant}
      size={size}
      type={type}
      spinnerClassName="size-[0.75em]"
      {...props}
    />
  )
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

export function SettingsBadgeError({
  label = "Error",
  className,
}: SettingsStatusBadgeProps) {
  return (
    <SettingsStatusBadge
      label={label}
      textClassName="text-destructive"
      dotClassName="bg-destructive"
      className={className}
    />
  )
}
