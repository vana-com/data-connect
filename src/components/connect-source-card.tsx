import type { ButtonHTMLAttributes, ElementType } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { buttonVariants } from "@/components/ui/button"
import { SourceRow } from "@/components/elements/source-row"
import { cn } from "@/lib/utils"

const connectSourceCardVariants = cva(
  [
    buttonVariants({ variant: "outline" }),
    "h-auto w-full items-start justify-between py-4",
    "text-left",
  ],
  {
    variants: {
      state: {
        available: ["hover:border-accent hover:shadow-[0_2px_8px_rgba(99,102,241,0.1)]"],
        comingSoon: "cursor-default text-muted-foreground",
      },
    },
    defaultVariants: {
      state: "available",
    },
  }
)

type ConnectSourceCardVariant = NonNullable<
  VariantProps<typeof connectSourceCardVariants>["state"]
>

export interface ConnectSourceCardProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> {
  label: string
  Icon: ElementType<{ className?: string }>
  meta?: string
  metaColor?: "mutedForeground" | "foreground"
  showArrow?: boolean
  state?: ConnectSourceCardVariant
}

export function ConnectSourceCard({
  label,
  Icon,
  meta,
  metaColor = "mutedForeground",
  showArrow = true,
  state = "available",
  className,
  ...props
}: ConnectSourceCardProps) {
  const isDisabled = state === "comingSoon"
  const arrowColor = isDisabled ? "text-muted-foreground" : "text-foreground"

  return (
    <button
      type="button"
      disabled={isDisabled}
      aria-disabled={isDisabled}
      className={cn(connectSourceCardVariants({ state, className }))}
      {...props}
    >
      <SourceRow
        layout="stacked"
        Icon={Icon}
        label={label}
        meta={meta}
        showArrow={showArrow}
        iconClassName={cn("grayscale", isDisabled && "opacity-70")}
        labelColor={isDisabled ? "mutedForeground" : "foreground"}
        metaColor={metaColor}
        arrowClassName={arrowColor}
      />
    </button>
  )
}
