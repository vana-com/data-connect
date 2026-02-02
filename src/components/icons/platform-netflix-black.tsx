import { Svg as SvgComponent, type SvgIconProps } from "@/components/utils/svg"
import { useMemo } from "react"

export const PlatformNetflixBlackIcon = (props: SvgIconProps) => {
  // Generate unique IDs to prevent gradient conflicts when multiple instances are rendered
  const ids = useMemo(() => {
    const suffix = Math.random().toString(36).substring(7)
    return {
      paint0: `paint0_linear_508_5674_${suffix}`,
      paint1: `paint1_linear_508_5674_${suffix}`,
      clip: `clip0_508_5674_${suffix}`,
    }
  }, [])

  return (
    <SvgComponent useBoxSize={false} viewBox="0 0 501 500" {...props}>
      <g clipPath={`url(#${ids.clip})`}>
        <path
          d="M250.569 0C146.197 0 115.672 0.107701 109.738 0.600051C88.3191 2.38097 74.9909 5.75433 60.4705 12.9857C49.2803 18.5439 40.4551 24.9867 31.7452 34.0183C15.8828 50.4889 6.26918 70.7521 2.78907 94.8388C1.09708 106.532 0.604865 108.917 0.504884 168.645C0.466429 188.554 0.504884 214.757 0.504884 249.902C0.504884 354.218 0.620247 384.721 1.12015 390.645C2.8506 411.493 6.11921 424.609 13.041 438.956C26.2693 466.42 51.5338 487.037 81.2974 494.73C91.6031 497.384 102.986 498.846 117.598 499.538C123.789 499.808 186.893 500 250.035 500C313.177 500 376.319 499.923 382.356 499.615C399.276 498.819 409.101 497.5 419.964 494.692C434.723 490.906 448.476 483.944 460.266 474.29C472.055 464.637 481.596 452.526 488.221 438.803C495.008 424.801 498.45 411.185 500.007 391.425C500.346 387.117 500.488 318.431 500.488 249.837C500.488 181.231 500.334 112.671 499.996 108.363C498.419 88.2844 494.977 74.7833 487.971 60.5128C482.222 48.8311 475.839 40.1072 466.571 31.1873C450.036 15.3859 429.809 5.76972 405.702 2.2925C394.023 0.603897 391.697 0.103855 331.939 0H250.569Z"
          fill="#161616"
        />
        <path
          d="M219.136 60.0001H146.406V440C170.257 434.351 195.173 431.523 219.136 430.459V60.0001Z"
          fill="#C20000"
        />
        <path
          d="M219.136 60.0001H146.406V350.753C170.257 345.105 195.173 342.277 219.136 341.213V60.0001Z"
          fill={`url(#${ids.paint0})`}
        />
        <path
          d="M354.57 440V60.0001H281.839V431.216C324.301 433.92 354.57 440 354.57 440Z"
          fill="#C20000"
        />
        <path
          d="M354.57 440V187.811H281.839V431.216C324.301 433.92 354.57 440 354.57 440Z"
          fill={`url(#${ids.paint1})`}
        />
        <path
          d="M354.57 440L219.136 60.0001H146.406L278.638 431.018C322.773 433.612 354.57 440 354.57 440Z"
          fill="#FA0000"
        />
      </g>
      <defs>
        <linearGradient
          id={ids.paint0}
          x1="133.434"
          y1="237.842"
          x2="187.565"
          y2="196.988"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#C20000" stopOpacity="0" />
          <stop offset="1" stopColor="#9D0000" />
        </linearGradient>
        <linearGradient
          id={ids.paint1}
          x1="365.11"
          y1="294.361"
          x2="316.086"
          y2="314.788"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#C20000" stopOpacity="0" />
          <stop offset="1" stopColor="#9D0000" />
        </linearGradient>
        <clipPath id={ids.clip}>
          <rect width="500" height="500" fill="white" transform="translate(0.487793)" />
        </clipPath>
      </defs>
    </SvgComponent>
  )
}
