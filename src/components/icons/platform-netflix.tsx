import { Svg as SvgComponent, type SvgIconProps } from "@/components/utils/svg"

export const PlatformNetflixIcon = (props: SvgIconProps) => {
  return (
    <SvgComponent useBoxSize={false} viewBox="0 0 501 500" {...props}>
      <g clipPath="url(#clip0_508_5667)">
        <path
          d="M209.236 0H113.538V500C144.921 492.568 177.705 488.846 209.236 487.446V0Z"
          fill="#C20000"
        />
        <path
          d="M209.236 0H113.538V382.57C144.921 375.138 177.705 371.417 209.236 370.017V0Z"
          fill="url(#paint0_linear_508_5667)"
        />
        <path
          d="M387.438 500V0H291.74V488.442C347.611 492 387.438 500 387.438 500Z"
          fill="#C20000"
        />
        <path
          d="M387.438 500V168.172H291.74V488.442C347.611 492 387.438 500 387.438 500Z"
          fill="url(#paint1_linear_508_5667)"
        />
        <path
          d="M387.438 500L209.236 0H113.538L287.527 488.182C345.6 491.595 387.438 500 387.438 500Z"
          fill="#FA0000"
        />
      </g>
      <defs>
        <linearGradient
          id="paint0_linear_508_5667"
          x1="96.469"
          y1="234.003"
          x2="167.694"
          y2="180.248"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#C20000" stopOpacity="0" />
          <stop offset="1" stopColor="#9D0000" />
        </linearGradient>
        <linearGradient
          id="paint1_linear_508_5667"
          x1="401.306"
          y1="308.37"
          x2="336.801"
          y2="335.247"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#C20000" stopOpacity="0" />
          <stop offset="1" stopColor="#9D0000" />
        </linearGradient>
        <clipPath id="clip0_508_5667">
          <rect width="500" height="500" fill="white" transform="translate(0.487793)" />
        </clipPath>
      </defs>
    </SvgComponent>
  )
}
