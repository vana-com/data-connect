import { Link } from "react-router-dom"
import { Text } from "@/components/typography/text"
import { cn } from "@/lib/classes"
import type { SourceLinkRowProps } from "../types"

const baseStyle = [
  "flex gap-2.5",
  "[&_svg:not([class*=size-])]:size-[1em]",
]

const interactiveStyle = "no-underline hover:text-foreground"

export function SourceLinkRow({
  children,
  icon,
  trailingIcon,
  muted,
  className,
  onClick,
  href,
  to,
}: SourceLinkRowProps) {
  const content = (
    <>
      {icon}
      {children}
      {trailingIcon}
    </>
  )

  const sharedProps = {
    intent: "small" as const,
    muted,
    withIcon: true as const,
  }

  if (to) {
    return (
      <Text
        as={Link}
        to={to}
        {...sharedProps}
        className={cn(baseStyle, interactiveStyle, className)}
        onClick={onClick}
      >
        {content}
      </Text>
    )
  }

  if (href) {
    return (
      <Text
        as="a"
        href={href}
        {...sharedProps}
        className={cn(baseStyle, interactiveStyle, className)}
        onClick={onClick}
      >
        {content}
      </Text>
    )
  }

  return (
    <Text as="div" {...sharedProps} className={cn(baseStyle, className)}>
      {content}
    </Text>
  )
}
