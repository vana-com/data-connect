import { Link } from "react-router-dom"
import { Text } from "@/components/typography/text"
import { cn } from "@/lib/classes"
import type { SourceLinkRowProps } from "../types"

const linkStyle = [
  "gap-2.5",
  "[&_svg:not([class*=size-])]:size-[1em]",
  "no-underline hover:text-foreground",
]

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
  if (to) {
    return (
      <Text
        as={Link}
        to={to}
        intent="small"
        muted={muted}
        withIcon
        className={cn(linkStyle, className)}
        onClick={onClick}
      >
        {icon}
        {children}
        {trailingIcon}
      </Text>
    )
  }

  return (
    <Text
      as="a"
      href={href}
      intent="small"
      muted={muted}
      withIcon
      className={cn(linkStyle, className)}
      onClick={onClick}
    >
      {icon}
      {children}
      {trailingIcon}
    </Text>
  )
}
