import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"

import { cn } from "@/lib/classes"

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        // layout
        "peer inline-flex h-5 w-9 shrink-0 items-center",
        // shape
        "rounded-full border border-transparent",
        // states
        "data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
        // focus
        "outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2",
        // disabled
        "disabled:cursor-not-allowed disabled:opacity-50",
        // effects
        "shadow-xs transition-all",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          // layout
          "pointer-events-none block size-4",
          // shape + surface
          "rounded-full bg-background ring-0",
          // states
          "data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0",
          // effects
          "transition-transform"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
