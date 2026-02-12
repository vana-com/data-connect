import type { ComponentPropsWithoutRef, ReactNode } from "react"
import { cn } from "@/lib/classes"
import { LINKS } from "@/config/links"

type LearnMoreLinkProps = Omit<ComponentPropsWithoutRef<"a">, "href" | "children"> & {
  href?: string
  children?: ReactNode
}

export function LearnMoreLink({
  href = LINKS.docs,
  children,
  className,
  ...props
}: LearnMoreLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("link", className)}
      {...props}
    >
      {children ?? "Learn more."}
    </a>
  )
}
