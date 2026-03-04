import type { ComponentPropsWithoutRef } from "react"

export const PlatformHebIcon = (
  props: ComponentPropsWithoutRef<"img"> & { style?: React.CSSProperties }
) => {
  return (
    <img
      src="/icons/heb.png"
      alt="H-E-B"
      {...props}
    />
  )
}
