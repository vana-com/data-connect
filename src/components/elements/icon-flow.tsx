import type { ComponentProps, ReactNode } from "react"
import { ArrowRightIcon } from "lucide-react"
import { cn } from "@/lib/classes"

interface IconFlowProps extends Omit<ComponentProps<"div">, "children"> {
  from: ReactNode
  to: ReactNode
  arrowClassName?: string
}

export function IconFlow({
  from,
  to,
  className,
  arrowClassName,
  ...props
}: IconFlowProps) {
  return (
    <div
      data-slot="icon-flow"
      className={cn("flex shrink-0 items-center gap-px", className)}
      {...props}
    >
      {from}
      <ArrowRightIcon
        aria-hidden="true"
        className={cn("size-[1.125em]", arrowClassName)}
      />
      {to}
    </div>
  )
}
