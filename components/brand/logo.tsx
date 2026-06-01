import Image from "next/image"

export const BRAND_LOGO_PATH = "/images/logo.png"

type BrandLogoProps = {
  src?: string | null
  alt?: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
}

export function BrandLogo({
  src,
  alt = "KoçUp Akademi",
  width = 120,
  height = 40,
  className,
  priority,
}: BrandLogoProps) {
  return (
    <Image
      src={src || BRAND_LOGO_PATH}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
    />
  )
}
