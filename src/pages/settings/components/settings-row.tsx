import { isValidElement, type ReactNode } from "react"
import { Text } from "@/components/typography/text"
import { cn } from "@/lib/classes"

interface SettingsRowProps {
  icon: ReactNode
  wrapIcon?: boolean
  iconContainerClassName?: string
  title: ReactNode
  description?: ReactNode
  descriptionTruncate?: boolean
  descriptionTitle?: string
  right?: ReactNode
  below?: ReactNode
  className?: string
  contentClassName?: string
}

export function SettingsRow({
  icon,
  wrapIcon = true,
  iconContainerClassName,
  title,
  description,
  descriptionTruncate = false,
  descriptionTitle,
  right,
  below,
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
      <Text
        as="div"
        intent="fine"
        muted
        truncate={descriptionTruncate}
        title={descriptionTitle}
      >
        {description}
      </Text>
    )

  const iconContent = wrapIcon ? (
    <div
      className={cn(
        "w-[34px] h-inset mt-px",
        "flex items-center justify-center rounded-button [&_svg]:size-5",
        iconContainerClassName
      )}
    >
      {icon}
    </div>
  ) : (
    icon
  )

  return (
    <div data-component="settings-row">
      <div
        className={cn(
          "flex gap-3 px-4 py-3",
          // descriptionContent ? "items-start" : "items-center",
          "items-center",
          className
        )}
      >
        {iconContent}
        <div
          className={cn(
            "flex-1",
            descriptionContent && "space-y-px",
            contentClassName
          )}
        >
          {titleContent}
          {descriptionContent}
        </div>
        {right}
      </div>
      {below}
    </div>
  )
}
