import type { ReactNode } from "react"
import type { TextProps } from "@/components/typography/text"
import { Text } from "@/components/typography/text"
import { cn } from "@/lib/utils"

type PageHeadingProps = Omit<
  TextProps<"h1">,
  "as" | "intent" | "weight" | "balance" | "children"
> & {
  children: ReactNode
}

export function PageHeading({
  children,
  className,
  ...props
}: PageHeadingProps) {
  return (
    <Text
      as="h1"
      intent="subtitle"
      weight="medium"
      balance
      className={cn("translate-y-[0.125em]", className)}
      {...props}
    >
      {children}
    </Text>
  )
}
