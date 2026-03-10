"use client"

import { actionButtonSurfaceClass } from "@/components/typography/button-action"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/classes"
import { ArrowUpRightIcon } from "lucide-react"
import { motion } from "motion/react"
import type { ReactNode } from "react"

type AppCardProps = {
  children: ReactNode
  ariaLabel?: string
  onClick?: () => void
  interactive?: boolean
  className?: string
}

const trailingAffordanceVariants = {
  rest: {
    opacity: 0,
    y: 8,
    transition: {
      duration: 0.14,
      ease: [0.4, 0, 1, 1],
    },
  },
  hover: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 35,
      delay: 0.2,
    },
  },
} as const

export function AppCard({
  children,
  ariaLabel,
  onClick,
  interactive = true,
  className,
}: AppCardProps) {
  const cardClassName = cn(
    buttonVariants({
      variant: "outline",
      size: "xl",
      fullWidth: true,
    }),
    "group min-h-[220px] min-w-0 whitespace-normal p-0! items-start!",
    interactive
      ? [actionButtonSurfaceClass, "overflow-visible"]
      : "bg-background/30! hover:border-ring/20 cursor-default p-0 transition-none",
    className
  )

  const cardContent = (
    <div className="w-full h-full flex-1 flex flex-col">
      <div className="p-4">{children}</div>
      <div className="mt-auto">
        <div
          className={cn(
            "flex w-full items-center justify-end text-left",
            "py-3.5 px-3"
          )}
        >
          {interactive ? (
            <motion.div
              data-slot="app-card-affordance"
              variants={trailingAffordanceVariants}
              className={cn(
                // size-5 + p-1 = 28px
                "pointer-events-none rounded-full bg-foreground p-1",
                "motion-reduce:transform-none motion-reduce:transition-none"
              )}
            >
              <ArrowUpRightIcon
                className="size-6 text-background"
                aria-hidden
              />
            </motion.div>
          ) : null}
        </div>
      </div>
    </div>
  )

  if (onClick) {
    return (
      <motion.button
        data-slot="app-card"
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        className={cn(cardClassName, "text-left")}
        initial="rest"
        whileHover={interactive ? "hover" : undefined}
        whileFocus={interactive ? "hover" : undefined}
      >
        {cardContent}
      </motion.button>
    )
  }

  return (
    <motion.div
      className={cardClassName}
      initial="rest"
      whileHover={interactive ? "hover" : undefined}
    >
      {cardContent}
    </motion.div>
  )
}
