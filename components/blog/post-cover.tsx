import Image from "next/image"

type PostCoverProps = {
  src: string | null
  alt: string
  priority?: boolean
  className?: string
  sizes?: string
}

export function PostCover({ src, alt, priority, className, sizes }: PostCoverProps) {
  if (src) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes ?? "(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"}
        priority={priority}
        className={`object-cover ${className ?? ""}`}
      />
    )
  }
  return (
    <div className={`absolute inset-0 bg-gradient-to-br from-[#1B6B8A] via-[#143847] to-[#0F1F28] flex items-center justify-center ${className ?? ""}`}>
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />
      <span className="relative text-white/30 font-extrabold text-3xl tracking-tight">
        KoçUp
      </span>
    </div>
  )
}
