import Link from "next/link"
import { Clock } from "lucide-react"
import { PostCover } from "./post-cover"
import { readingTime } from "@/lib/blog/read-time"

type PostCardData = {
  slug: string
  title: string
  excerpt: string
  cover_image_url: string | null
  published_at: string | null
  content: string
  category?: { name: string; slug: string } | null
}

const TR_DATE = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
})

export function PostCard({ post, featured = false }: { post: PostCardData; featured?: boolean }) {
  const minutes = readingTime(post.content)
  const date = post.published_at ? TR_DATE.format(new Date(post.published_at)) : ""

  if (featured) {
    return (
      <Link
        href={`/blog/${post.slug}`}
        className="group block bg-white rounded-3xl overflow-hidden border border-zinc-200 hover:border-[#F97316]/40 hover:shadow-2xl hover:shadow-orange-500/5 transition-all duration-200"
      >
        <div className="grid md:grid-cols-2 gap-0">
          <div className="relative aspect-[16/10] md:aspect-auto md:min-h-[320px] overflow-hidden">
            <PostCover
              src={post.cover_image_url}
              alt={post.title}
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              className="group-hover:scale-105 transition-transform duration-500"
            />
          </div>
          <div className="p-7 md:p-10 flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-4">
              {post.category && (
                <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-[#F97316] bg-orange-50 px-3 py-1 rounded-full">
                  {post.category.name}
                </span>
              )}
              <span className="text-xs text-zinc-400">Öne Çıkan</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-900 mb-3 leading-tight group-hover:text-[#1B6B8A] transition-colors">
              {post.title}
            </h2>
            <p className="text-sm md:text-base text-zinc-600 leading-relaxed mb-5 line-clamp-3">
              {post.excerpt}
            </p>
            <div className="flex items-center gap-4 text-xs text-zinc-500">
              <span>{date}</span>
              <span className="w-1 h-1 rounded-full bg-zinc-300" />
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {minutes} dk okuma
              </span>
            </div>
          </div>
        </div>
      </Link>
    )
  }

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group block bg-white rounded-2xl overflow-hidden border border-zinc-200 hover:border-[#F97316]/40 hover:shadow-lg hover:shadow-orange-500/5 hover:-translate-y-1 transition-all duration-200"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <PostCover
          src={post.cover_image_url}
          alt={post.title}
          className="group-hover:scale-105 transition-transform duration-500"
        />
      </div>
      <div className="p-5 md:p-6">
        {post.category && (
          <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-[#F97316] bg-orange-50 px-2.5 py-1 rounded-full mb-3">
            {post.category.name}
          </span>
        )}
        <h3 className="text-base md:text-lg font-bold tracking-tight text-zinc-900 mb-2 leading-snug group-hover:text-[#1B6B8A] transition-colors line-clamp-2">
          {post.title}
        </h3>
        <p className="text-sm text-zinc-500 leading-relaxed mb-4 line-clamp-2">
          {post.excerpt}
        </p>
        <div className="flex items-center gap-3 text-xs text-zinc-400">
          <span>{date}</span>
          <span className="w-1 h-1 rounded-full bg-zinc-300" />
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {minutes} dk
          </span>
        </div>
      </div>
    </Link>
  )
}
