import { Children, Fragment, type ComponentProps, type ReactNode } from "react"
import { ChevronRightIcon } from "lucide-react"
import { PlatformIcon } from "@/components/icons/platform-icon"
import { ActionButtonGroup } from "@/components/typography/button-action"
import { stateFocus } from "@/components/typography/field"
import { Text } from "@/components/typography/text"
import { cn } from "@/lib/classes"

export interface SourceRowProps {
  iconName: string
  label: string
  meta?: string
  showArrow?: boolean
  fallbackLabel?: string
  iconClassName?: string
  arrowClassName?: string
}

interface SourceRowContentProps {
  iconName: string
  fallbackLabel?: string
  iconClassName?: string
  label: string
  meta?: string
}

function SourceRowContent({
  iconName,
  fallbackLabel,
  iconClassName,
  label,
  meta,
}: SourceRowContentProps) {
  return (
    <div
      data-slot="source-row-content"
      className="h-full min-w-0 flex-1 flex items-center gap-3"
    >
      <PlatformIcon
        iconName={iconName}
        className={cn(iconClassName)}
        fallbackLabel={fallbackLabel}
      />
      <div className="flex items-baseline gap-2">
        {label}

        {meta ? (
          <Text as="span" intent="small" color="mutedForeground">
            {meta}
          </Text>
        ) : null}
      </div>
    </div>
  )
}

interface SourceRowActionButtonProps extends Omit<
  ComponentProps<"button">,
  "type"
> {}

export const sourceRowActionStyle =
  "text-foreground-muted/70 group-hover:text-foreground"

export const sourceRowActionInteractiveClass = cn(
  "flex h-full items-center justify-center",
  "[&_svg:not([class*='size-']):not([data-slot=spinner])]:size-5!",
  "[&_svg]:text-foreground-muted/70",
  "hover:[&_svg]:text-foreground focus-visible:[&_svg]:text-foreground",
  stateFocus
)

export const sourceRowEndActionInteractiveClass = cn(
  sourceRowActionInteractiveClass,
  "group-hover:[&_svg]:text-foreground",
  "group-has-[[data-slot=source-row-middle-slot]:hover]:[&_svg]:text-foreground-muted/70",
  "group-has-[[data-slot=source-row-middle-slot]:focus-within]:[&_svg]:text-foreground-muted/70"
)

export function SourceRowActionButton({
  className,
  children,
  ...props
}: SourceRowActionButtonProps) {
  return (
    <button
      data-slot="source-row-action-button"
      type="button"
      className={cn(
        "cursor-pointer",
        sourceRowActionInteractiveClass,
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

/* @deprecated Unused! Use SourceRowWithActions instead */
export function SourceRow({
  iconName,
  label,
  meta,
  showArrow,
  fallbackLabel,
  iconClassName,
  arrowClassName,
}: SourceRowProps) {
  const shouldShowArrow = showArrow ?? Boolean(meta)

  return (
    <>
      <SourceRowContent
        iconName={iconName}
        fallbackLabel={fallbackLabel}
        iconClassName={iconClassName}
        label={label}
        meta={meta}
      />

      {/* RHS */}
      {shouldShowArrow ? (
        <div className="h-full flex items-center gap-3">
          <ChevronRightIcon
            className={cn(sourceRowActionStyle, "size-7", arrowClassName)}
            aria-hidden
          />
        </div>
      ) : null}
    </>
  )
}

export interface SourceRowWithActionsProps {
  iconName: string
  label: string
  meta?: string
  fallbackLabel?: string
  iconClassName?: string
  rowAction?: {
    onClick?: () => void
    disabled?: boolean
    ariaLabel?: string
    className?: string
  }
  middleSlot?: ReactNode
  endSlot?: ReactNode
  endSlotClassName?: string
  className?: string
  surface?: "standalone" | "list-item"
}

interface SourceRowListProps {
  children: ReactNode
  className?: string
}

export function SourceRowList({ children, className }: SourceRowListProps) {
  const items = Children.toArray(children)

  return (
    <div
      data-slot="source-row-list"
      className={cn(
        "action-outset overflow-hidden rounded-card ring ring-border/30 bg-background",
        className
      )}
    >
      {items.map((child, index) => (
        <Fragment key={index}>
          {child}
          {index < items.length - 1 ? (
            <div
              data-slot="source-row-divider"
              className="ml-row-gutter border-t border-border/70"
            />
          ) : null}
        </Fragment>
      ))}
    </div>
  )
}

export function SourceRowWithActions({
  iconName,
  label,
  meta,
  fallbackLabel,
  iconClassName,
  rowAction,
  middleSlot,
  endSlot,
  endSlotClassName,
  className,
  surface = "standalone",
}: SourceRowWithActionsProps) {
  const {
    onClick: onRowClick,
    disabled: rowDisabled = false,
    ariaLabel: rowAriaLabel,
    className: rowClassName,
  } = rowAction ?? {}

  return (
    <ActionButtonGroup
      className={className}
      surface={surface === "list-item" ? "flat" : "standalone"}
    >
      <button
        data-slot="source-row-main-button"
        type="button"
        className={cn(
          "cursor-pointer",
          "h-full min-w-0 flex-1",
          "px-4 text-left",
          stateFocus,
          rowClassName
        )}
        onClick={onRowClick}
        disabled={rowDisabled}
        aria-label={rowAriaLabel}
      >
        <SourceRowContent
          iconName={iconName}
          fallbackLabel={fallbackLabel}
          iconClassName={iconClassName}
          label={label}
          meta={meta}
        />
      </button>

      {middleSlot ? (
        <div data-slot="source-row-middle-slot" className="h-full">
          {middleSlot}
        </div>
      ) : null}

      <SourceRowActionButton
        data-slot="source-row-end-button"
        className={cn(
          sourceRowEndActionInteractiveClass,
          "pl-0.5 pr-4",
          endSlotClassName
        )}
        onClick={onRowClick}
        disabled={rowDisabled}
        aria-label={rowAriaLabel}
      >
        {endSlot ?? <ChevronRightIcon aria-hidden />}
      </SourceRowActionButton>
    </ActionButtonGroup>
  )
}
