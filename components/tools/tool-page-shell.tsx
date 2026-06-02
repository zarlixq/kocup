import Link from "next/link"
import { ArrowLeft, BookOpen } from "lucide-react"
import { cn } from "@/lib/utils"

export function ToolHero({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <section className="relative bg-gradient-to-br from-[#0F1F28] via-[#143847] to-[#1B6B8A] text-white px-5 md:px-8 lg:px-12 pt-14 md:pt-20 pb-16 md:pb-20 overflow-hidden">
      <div
        className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#F97316]/15 blur-3xl rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none"
        aria-hidden="true"
      />
      <div className="max-w-3xl mx-auto relative">
        <Link
          href="/araclar"
          className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white mb-5 transition-colors min-h-[36px]"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Tüm araçlar
        </Link>
        <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[#F97316] mb-2">
          {eyebrow}
        </span>
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
          {title}
        </h1>
        <p className="text-white/75 text-base md:text-lg mt-3 leading-relaxed">
          {description}
        </p>
      </div>
    </section>
  )
}

export function RelatedBlogCallout({
  blogSlug,
  blogTitle,
  caption,
}: {
  blogSlug: string
  blogTitle: string
  caption: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-zinc-50 border border-zinc-200 p-4 sm:p-5">
      <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center shrink-0">
        <BookOpen className="w-5 h-5 text-[#1B6B8A]" aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs uppercase tracking-widest text-zinc-500 font-semibold mb-1">
          İlgili yazı
        </div>
        <Link
          href={`/blog/${blogSlug}`}
          className="font-bold text-zinc-900 hover:text-[#1B6B8A] transition-colors block leading-snug"
        >
          {blogTitle}
        </Link>
        <p className="text-sm text-zinc-500 mt-1 leading-relaxed">{caption}</p>
      </div>
    </div>
  )
}

/**
 * Hero ile overlap eden içerik kabuğu.
 *
 * Neden `relative z-10`:
 * ToolHero `position: relative` (içindeki absolute blur blob için). CSS painting
 * order'a göre positioned-without-z-index elementler static elementlerin ÜZERİNE
 * boyanır — DOM sırasından bağımsız. Bu yüzden hero, peşinden gelen static
 * içerik section'ının üstüne biniyor ve negatif margin ile yukarı çekilen ilk
 * kart (sekme barı dahil) hero'nun arkasında kalıyordu. `relative z-10` ile
 * içerik kendi pozitif z-index seviyesine taşınıp hero'nun üstünde boyanır.
 */
export function ToolContentSection({
  maxWidth = "max-w-3xl",
  children,
}: {
  maxWidth?: "max-w-2xl" | "max-w-3xl"
  children: React.ReactNode
}) {
  return (
    <section className="relative z-10 px-5 md:px-8 lg:px-12 -mt-10 md:-mt-12">
      <div className={cn("mx-auto space-y-6", maxWidth)}>{children}</div>
    </section>
  )
}

export function BackToTools() {
  return (
    <div className="mt-8 text-center">
      <Link
        href="/araclar"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1B6B8A] hover:gap-2.5 transition-all min-h-[44px]"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        Diğer araçlara göz at
      </Link>
    </div>
  )
}
