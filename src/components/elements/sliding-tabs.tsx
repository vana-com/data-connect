"use client"

import { cn } from "@/lib/classes"
import { motion } from "motion/react"

interface Tab {
  value: string
  label: string
}

interface SlidingTabsProps {
  tabs: Tab[]
  value: string
  onValueChange: (value: string) => void
  className?: string
  ulClassName?: string
  disabled?: boolean
}

export function SlidingTabs({
  tabs,
  value,
  onValueChange,
  className,
  ulClassName,
  disabled,
}: SlidingTabsProps) {
  return (
    <nav className={cn("relative", className)}>
      <ul className={cn("flex gap-1.5", ulClassName)}>
        {tabs.map(tab => {
          const isSelected = value === tab.value

          return (
            <li key={tab.value} className="relative">
              {isSelected && (
                <motion.div
                  layoutId="selected-indicator"
                  className="absolute inset-0 bg-foreground/[0.07] rounded-button z-0"
                  transition={{
                    type: "spring",
                    stiffness: 420, // speed
                    damping: 37, // resistance/bounce
                  }}
                />
              )}
              <motion.button
                type="button"
                role="tab"
                aria-selected={isSelected}
                disabled={disabled}
                onClick={() => onValueChange(tab.value)}
                whileTap={disabled ? undefined : { scale: 0.97 }}
                className={cn(
                  "relative z-10 px-4 py-2",
                  "text-xlarge font-medium",
                  "transition-colors disabled:cursor-not-allowed",
                  isSelected
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </motion.button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
