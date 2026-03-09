import {
  type CSSProperties,
  type ElementType,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react"
import { Text } from "@/components/typography/text"
import { cn } from "@/lib/classes"

type AdaptiveIconComponent = ElementType<{
  className?: string
  style?: CSSProperties
  "aria-hidden"?: boolean
}>

export type AdaptiveIconVariant = "solid" | "padded" | "plain"

type AdaptiveIconProps = Omit<ComponentProps<"div">, "children"> & {
  imageSources?: Array<string | null | undefined>
  imageAlt?: string
  size?: number
  imageScale?: number
  icon?: AdaptiveIconComponent
  iconClassName?: string
  iconScale?: number
  fallbackLabel?: string
  fallback?: ReactNode
  fallbackScale?: number
  variant?: AdaptiveIconVariant
}

export function AdaptiveIcon({
  imageSources = [],
  imageAlt = "",
  size = 32,
  imageScale = 1,
  icon: Icon,
  iconClassName,
  iconScale,
  fallbackLabel,
  fallback,
  fallbackScale = 0.75,
  variant = "solid",
  className,
  style,
  ...props
}: AdaptiveIconProps) {
  const resolvedImageSources = imageSources.filter((value): value is string =>
    Boolean(value)
  )
  const imageSourcesKey = resolvedImageSources.join("\0")
  const [imageIndex, setImageIndex] = useState(0)
  const [loadedImageSrc, setLoadedImageSrc] = useState<string | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const scaledImageSize = Math.round(size * imageScale)
  const resolvedIconScale = iconScale ?? (variant === "padded" ? 1 : 0.75)
  const scaledIconSize = Math.round(size * resolvedIconScale)
  const scaledFallbackSize = Math.round(size * fallbackScale)
  const imageBorderRadiusPx = Math.max(3, Math.round(scaledImageSize * 0.12))
  const innerBorderRadiusPx = Math.max(3, Math.round(size * 0.12))

  useEffect(() => {
    setImageIndex(0)
    setLoadedImageSrc(null)
  }, [imageSourcesKey])

  const activeImageSrc = resolvedImageSources[imageIndex]
  const isLoaded = activeImageSrc != null && loadedImageSrc === activeImageSrc

  useEffect(() => {
    setLoadedImageSrc(null)
  }, [activeImageSrc])

  useEffect(() => {
    const image = imageRef.current
    if (!activeImageSrc || !image || !image.complete) {
      return
    }

    if (image.naturalWidth > 0) {
      setLoadedImageSrc(activeImageSrc)
      return
    }

    setImageIndex(current => current + 1)
  }, [activeImageSrc])

  const handleImageLoad = () => {
    if (activeImageSrc) {
      setLoadedImageSrc(activeImageSrc)
    }
  }

  const handleImageError = () => {
    setImageIndex(current => current + 1)
  }

  const nonImageNode =
    fallback ??
    (Icon ? (
      <Icon
        className={cn(variant === "solid" && "text-background", iconClassName)}
        style={{
          width: `${scaledIconSize}px`,
          height: `${scaledIconSize}px`,
        }}
        aria-hidden
      />
    ) : fallbackLabel ? (
      <Text
        as="span"
        intent="small"
        weight="semi"
        inline
        color="background"
        className={cn(
          variant !== "solid" &&
            "flex items-center justify-center overflow-hidden bg-foreground"
        )}
        style={{
          fontSize: `${scaledFallbackSize}px`,
          ...(variant !== "solid"
            ? {
                width: `${size}px`,
                height: `${size}px`,
                borderRadius: `${innerBorderRadiusPx}px`,
              }
            : {}),
        }}
      >
        {fallbackLabel}
      </Text>
    ) : null)

  const rootClassName = cn(
    "shrink-0 flex items-center justify-center rounded-button overflow-hidden",
    variant === "padded" && "p-1",
    variant === "solid" && "bg-foreground"
  )

  // Padded images need an inner frame so the loading surface and image radius
  // stay inside the outer rounded shell.
  const imageNode =
    variant === "padded" ? (
      <span
        className={cn(
          "flex items-center justify-center overflow-hidden",
          !isLoaded && "bg-muted"
        )}
        style={{
          width: `${scaledImageSize}px`,
          height: `${scaledImageSize}px`,
          borderRadius: `${imageBorderRadiusPx}px`,
        }}
      >
        <img
          ref={imageRef}
          src={activeImageSrc}
          alt={imageAlt}
          className="h-full w-full object-contain"
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      </span>
    ) : (
      <img
        ref={imageRef}
        src={activeImageSrc}
        alt={imageAlt}
        aria-hidden={imageAlt === "" ? true : undefined}
        className="size-full object-contain"
        onLoad={handleImageLoad}
        onError={handleImageError}
      />
    )

  return (
    <div
      data-slot="adaptive-icon"
      className={cn(rootClassName, className)}
      style={
        // Padded mode sizes the inner frame; other variants size the root.
        variant === "padded"
          ? style
          : {
              width: `${size}px`,
              height: `${size}px`,
              ...style,
            }
      }
      {...props}
    >
      {activeImageSrc ? imageNode : nonImageNode}
    </div>
  )
}
