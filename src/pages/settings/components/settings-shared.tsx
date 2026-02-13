import {
  Children,
  Fragment,
  type ComponentPropsWithoutRef,
  isValidElement,
  type ReactNode,
} from "react"
import { Text } from "@/components/typography/text"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/classes"

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

interface SettingsRowProps {
  icon: ReactNode
  wrapIcon?: boolean
  iconContainerClassName?: string
  title: ReactNode
  description?: ReactNode
  right?: ReactNode
  className?: string
  contentClassName?: string
}

interface SettingsMetaRowProps {
  title: ReactNode
  description?: ReactNode
  badge?: ReactNode
  className?: string
}

interface SettingsStatusBadgeProps {
  label?: ReactNode
  className?: string
}

type SettingsRowActionProps = Omit<
  ComponentPropsWithoutRef<typeof Button>,
  "variant" | "size"
>

export function SettingsRow({
  icon,
  wrapIcon = true,
  iconContainerClassName,
  title,
  description,
  right,
  className,
  contentClassName,
}: SettingsRowProps) {
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
      <Text as="div" intent="small" muted>
        {description}
      </Text>
    )

  const iconContent = wrapIcon ? (
    <div
      className={cn(
        "w-[34px] h-inset mt-0.5",
        "flex items-center justify-center rounded-button [&_svg]:size-6",
        iconContainerClassName
      )}
    >
      {icon}
    </div>
  ) : (
    icon
  )

  return (
    <div
      data-component="settings-row"
      className={cn(
        "flex gap-4 p-4",
        descriptionContent ? "items-start" : "items-center",
        className
      )}
    >
      {iconContent}
      <div
        className={cn(
          "flex-1",
          descriptionContent && "space-y-0.5",
          contentClassName
        )}
      >
        {titleContent}
        {descriptionContent}
      </div>
      {right}
    </div>
  )
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

export function SettingsRowAction({
  type = "button",
  ...props
}: SettingsRowActionProps) {
  return (
    <Button
      type={type}
      variant="outline"
      size="sm"
      className="hover:bg-muted"
      {...props}
    />
  )
}

export function SettingsRowDivider() {
  return (
    <div data-component="settings-row-divider" className="pl-4">
      <div className="border-t border-border" />
    </div>
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
