import type { ComponentPropsWithoutRef, ReactNode } from "react"
import { LINKS } from "@/config/links"
import { OpenExternalLink } from "./link-open-external"

type LearnMoreLinkProps = Omit<
  ComponentPropsWithoutRef<typeof OpenExternalLink>,
  "href" | "children"
> & {
  href?: string
  children?: ReactNode
}

export function LearnMoreLink({
  href = LINKS.docs,
  children,
  ...props
}: LearnMoreLinkProps) {
  return (
    <OpenExternalLink href={href} {...props}>
      {children ?? "Learn more."}
    </OpenExternalLink>
  )
}
