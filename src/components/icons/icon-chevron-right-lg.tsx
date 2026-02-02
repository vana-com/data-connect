import { Svg as SvgComponent, type SvgIconProps } from "@/components/utils/svg"

export const IconChevronRightLg = (props: SvgIconProps) => {
  return (
    <SvgComponent useBoxSize={true} viewBox="0 0 24 24" {...props}>
      <path
        d="M8.64651 5.64648C8.84177 5.45122 9.15828 5.45122 9.35354 5.64648L15.3535 11.6465C15.5488 11.8417 15.5488 12.1583 15.3535 12.3535L9.35354 18.3535C9.15828 18.5488 8.84177 18.5488 8.64651 18.3535C8.45125 18.1583 8.45125 17.8417 8.64651 17.6465L14.293 12L8.64651 6.35352C8.45125 6.15825 8.45125 5.84175 8.64651 5.64648Z"
        fill="currentColor"
      />
    </SvgComponent>
  )
}
