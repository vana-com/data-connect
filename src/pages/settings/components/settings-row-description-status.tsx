import type { ReactNode } from "react"
import { Text } from "@/components/typography/text"
import type { TextProps } from "@/components/typography/text"
import { cn } from "@/lib/classes"
import { SettingsRowDescriptionDot } from "./settings-row-description-shared"

type StatusTone = "success" | "accent" | "warning" | "destructive" | "muted"
type DotPosition = "left" | "right"

interface SettingsRowDescriptionStatusProps {
  tone: StatusTone
  children: ReactNode
  intent?: TextProps<"div">["intent"]
  dotPosition?: DotPosition
  className?: string
  pulse?: boolean
}

const toneStyles: Record<
  StatusTone,
  { textClassName: string; dotClassName: string }
> = {
  success: {
    textClassName: "text-success-foreground",
    dotClassName: "bg-success-foreground",
  },
  accent: {
    textClassName: "text-accent",
    dotClassName: "bg-accent",
  },
  warning: {
    textClassName: "text-warning",
    dotClassName: "bg-warning",
  },
  destructive: {
    textClassName: "text-destructive-foreground",
    dotClassName: "bg-destructive-foreground",
  },
  muted: {
    textClassName: "text-muted-foreground",
    dotClassName: "bg-muted-foreground/70",
  },
}

export function SettingsRowDescriptionStatus({
  tone,
  children,
  intent = "fine",
  dotPosition = "left",
  className,
  pulse,
}: SettingsRowDescriptionStatusProps) {
  const toneStyle = toneStyles[tone]
  const gapClassName = intent === "fine" ? "gap-[5px]" : "gap-1.5"
  const dotClassName = cn(toneStyle.dotClassName, pulse && "animate-pulse")

  return (
    <Text
      as="div"
      intent={intent}
      withIcon
      className={cn(gapClassName, toneStyle.textClassName, className)}
    >
      {dotPosition === "left" ? (
        <SettingsRowDescriptionDot className={dotClassName} />
      ) : null}
      {children}
      {dotPosition === "right" ? (
        <SettingsRowDescriptionDot className={dotClassName} />
      ) : null}
    </Text>
  )
}
