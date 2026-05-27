import type { Metadata } from "next"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { PostCard } from "@/components/blog/post-card"
import { CategoryChips } from "@/components/blog/category-chips"
import { JsonLd } from "@/components/seo/json-ld"
import { breadcrumbSchema } from "@/lib/seo/schemas"
import { getSiteUrl } from "@/lib/site-url"

const POSTS_PER_PAGE = 9
const siteUrl = getSiteUrl()

export const revalidate = 3600

export const metadata: Metadata = {
  title: "Blog — Eğitim Koçluğu ve YKS Hazırlığı",
  description:
    "Eğitim koçluğu, YKS hazırlık stratejileri, çalışma teknikleri ve veli rehberi üzerine güncel yazılar.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "KoçUp Blog — Eğitim Koçluğu ve YKS Hazırlığı",
    description: "Eğitim koçluğu, sınav stratejileri ve çalışma teknikleri üzerine yazılar.",
    url: "/blog",
    type: "website",
  },
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ sayfa?: string }>
}) {
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.sayfa ?? "1", 10) || 1)
  const from = (page - 1) * POSTS_PER_PAGE
  const to = from + POSTS_PER_PAGE - 1

  const supabase = await createClient()

  const [{ data: categories }, { count }, { data: posts }] = await Promise.all([
    supabase.from("blog_categories").select("name, slug").order("name"),
    supabase
      .from("blog_posts")
      .select("*", { count: "exact", head: true })
      .eq("status", "published"),
    supabase
      .from("blog_posts")
      .select(
        "slug, title, excerpt, content, cover_image_url, published_at, blog_categories(name, slug)"
      )
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .range(from, to),
  ])

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / POSTS_PER_PAGE))
  const safePosts = (posts ?? []).map((p) => ({
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    content: p.content,
    cover_image_url: p.cover_image_url,
    published_at: p.published_at,
    category: p.blog_categories
      ? { name: p.blog_categories.name, slug: p.blog_categories.slug }
      : null,
  }))

  const featured = page === 1 ? safePosts[0] ?? null : null
  const rest = page === 1 ? safePosts.slice(1) : safePosts

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Ana Sayfa", url: `${siteUrl}/` },
          { name: "Blog", url: `${siteUrl}/blog` },
        ])}
      />

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#0F1F28] via-[#143847] to-[#1B6B8A] text-white py-16 md:py-24 px-5 md:px-8 lg:px-12">
        <div className="max-w-6xl mx-auto">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[#F97316] mb-3">
            Blog
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight mb-4 max-w-2xl">
            Eğitim koçluğu ve{" "}
            <span className="text-[#F97316]">YKS hazırlığı</span> üzerine yazılar.
          </h1>
          <p className="text-base md:text-lg text-blue-100/80 leading-relaxed max-w-xl">
            Süreç, strateji ve çalışma teknikleri — koçluk dünyasından öğrencilere ve
            velilere güncel içerikler.
          </p>
        </div>
      </section>

      {/* Categories */}
      <section className="border-b border-zinc-200 bg-white sticky top-16 md:top-[4.5rem] z-30">
        <div className="max-w-6xl mx-auto px-5 md:px-8 lg:px-12 py-4">
          <CategoryChips categories={categories ?? []} />
        </div>
      </section>

      {/* Posts */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 lg:px-12 py-12 md:py-16">
        {safePosts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center">
            <p className="text-zinc-500">Henüz yazı yok.</p>
          </div>
        ) : (
          <>
            {featured && (
              <div className="mb-10 md:mb-12">
                <PostCard post={featured} featured />
              </div>
            )}

            {rest.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
                {rest.map((post) => (
                  <PostCard key={post.slug} post={post} />
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <Pagination page={page} totalPages={totalPages} basePath="/blog" />
            )}
          </>
        )}
      </section>
    </>
  )
}

function Pagination({
  page,
  totalPages,
  basePath,
}: {
  page: number
  totalPages: number
  basePath: string
}) {
  const prev = page > 1 ? `${basePath}${page - 1 === 1 ? "" : `?sayfa=${page - 1}`}` : null
  const next = page < totalPages ? `${basePath}?sayfa=${page + 1}` : null

  return (
    <div className="mt-12 flex items-center justify-between gap-4">
      {prev ? (
        <Link
          href={prev}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-zinc-200 bg-white text-sm font-semibold text-zinc-700 hover:border-[#1B6B8A] hover:text-[#1B6B8A] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Önceki
        </Link>
      ) : (
        <span className="text-sm text-zinc-400 px-4 py-2.5">İlk sayfa</span>
      )}
      <span className="text-sm text-zinc-500 font-medium">
        Sayfa {page} / {totalPages}
      </span>
      {next ? (
        <Link
          href={next}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-zinc-200 bg-white text-sm font-semibold text-zinc-700 hover:border-[#1B6B8A] hover:text-[#1B6B8A] transition-colors"
        >
          Sonraki
          <ChevronRight className="w-4 h-4" />
        </Link>
      ) : (
        <span className="text-sm text-zinc-400 px-4 py-2.5">Son sayfa</span>
      )}
    </div>
  )
}
