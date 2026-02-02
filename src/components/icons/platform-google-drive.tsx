import { Svg as SvgComponent, type SvgIconProps } from "@/components/utils/svg"

export const PlatformGoogleDriveIcon = (props: SvgIconProps) => {
  return (
    <SvgComponent useBoxSize={false} viewBox="0 0 502 500" {...props}>
      <g clipPath="url(#clip0_513_5704)">
        <path
          d="M84.3699 466.549L167.696 322.182H501.028L417.694 466.549H84.3699Z"
          fill="#3777E3"
        />
        <path
          d="M334.371 322.183H501.031L334.371 33.4494H167.699L334.371 322.183Z"
          fill="#FFCF63"
        />
        <path
          d="M1.03076 322.184L84.3685 466.55L251.029 177.817L167.695 33.4495L1.03076 322.184Z"
          fill="#11A861"
        />
      </g>
      <defs>
        <clipPath id="clip0_513_5704">
          <rect width="501" height="500" fill="white" transform="translate(0.625977)" />
        </clipPath>
      </defs>
    </SvgComponent>
  )
}
