import type { MouseEvent } from "react"
import type { TextProps } from "@/components/typography/text"
import { Text } from "@/components/typography/text"
import { cn } from "@/lib/classes"
import { openExternalUrl } from "@/lib/open-resource"

const linkClassName = "link [font:inherit] hover:text-foreground"

type OpenExternalLinkProps = Omit<TextProps<"a">, "as" | "href"> & {
  href: string
}

const isTauriRuntime = () =>
  typeof window !== "undefined" &&
  ("__TAURI__" in window || "__TAURI_INTERNALS__" in window)

export function OpenExternalLink({
  href,
  className,
  onClick,
  target = "_blank",
  rel = "noopener noreferrer",
  ...props
}: OpenExternalLinkProps) {
  return (
    <Text
      as="a"
      href={href}
      target={target}
      rel={rel}
      intent="inherit"
      color="inherit"
      className={cn(linkClassName, className)}
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(event)
        if (event.defaultPrevented) return
        if (!isTauriRuntime()) return
        event.preventDefault()
        void openExternalUrl(href)
      }}
      {...props}
    />
  )
}

type ActionLinkProps = Omit<TextProps<"button">, "as" | "type"> & {
  onPress: () => void | Promise<void>
}

export function ActionLink({
  onPress,
  className,
  onClick,
  ...props
}: ActionLinkProps) {
  return (
    <Text
      as="button"
      type="button"
      intent="inherit"
      color="inherit"
      className={cn(linkClassName, className)}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        onClick?.(event)
        if (event.defaultPrevented) return
        void onPress()
      }}
      {...props}
    />
  )
}
