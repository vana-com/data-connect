import type { ComponentPropsWithoutRef, ReactNode } from "react"
import { Loader2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/classes"

type LoadingButtonProps = ComponentPropsWithoutRef<typeof Button> & {
  isLoading?: boolean
  loadingLabel?: ReactNode
  spinnerClassName?: string
}

export function LoadingButton({
  type = "button",
  disabled,
  isLoading = false,
  loadingLabel,
  spinnerClassName,
  children,
  ...props
}: LoadingButtonProps) {
  return (
    <Button type={type} disabled={disabled || isLoading} {...props}>
      {isLoading ? (
        <>
          <Loader2Icon
            aria-hidden="true"
            className={cn("animate-spin", spinnerClassName)}
          />
          {loadingLabel ?? children ?? "Loading…"}
        </>
      ) : (
        children
      )}
    </Button>
  )
}
