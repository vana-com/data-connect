import type { ComponentPropsWithoutRef, ReactNode } from "react"
import { ArrowRightIcon } from "lucide-react"
import { VanaV } from "@/components/icons/vana-v"
import { Button, ButtonArrow } from "@/components/ui/button"
import { cn } from "@/lib/classes"

type ButtonSignInVanaProps = Omit<
  ComponentPropsWithoutRef<typeof Button>,
  "children"
> & {
  label?: ReactNode
  showArrow?: boolean
  arrowClassName?: string
}

export function ButtonSignInVana({
  type = "button",
  variant = "accent",
  label = "Vana Passport Sign-in",
  showArrow = false,
  arrowClassName,
  ...props
}: ButtonSignInVanaProps) {
  return (
    <Button type={type} variant={variant} {...props}>
      <div className="border border-current p-0.75 rounded-soft">
        <VanaV aria-hidden="true" className="size-[0.5em]" />
      </div>
      {label}
      {showArrow ? (
        <ButtonArrow
          icon={ArrowRightIcon}
          className={cn("ms-0", arrowClassName)}
        />
      ) : null}
    </Button>
  )
}
