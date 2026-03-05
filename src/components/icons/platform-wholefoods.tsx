import type { ComponentPropsWithoutRef } from "react"

export const PlatformWholeFoodsIcon = (
  props: ComponentPropsWithoutRef<"img"> & { style?: React.CSSProperties }
) => {
  return (
    <img
      src="/icons/wholefoods.png"
      alt="Whole Foods Market"
      {...props}
    />
  )
}
