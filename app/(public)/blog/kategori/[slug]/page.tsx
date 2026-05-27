import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { PostCard } from "@/components/blog/post-card"
import { CategoryChips } from "@/components/blog/category-chips"
import { JsonLd } from "@/components/seo/json-ld"
import { breadcrumbSchema } from "@/lib/seo/schemas"
import { getSiteUrl } from "@/lib/site-url"

const POSTS_PER_PAGE = 9
const siteUrl = getSiteUrl()

export const revalidate = 3600

export async function generateStaticParams() {
  // Build time'da çalışır — cookies/RLS context yok, service role kullan
  const supabase = supabaseAdmin()
  const { data } = await supabase.from("blog_categories").select("slug")
  return (data ?? []).map((c) => ({ slug: c.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data: cat } = await supabase
    .from("blog_categories")
    .select("name, description")
    .eq("slug", slug)
    .maybeSingle()

  if (!cat) return { title: "Kategori bulunamadı" }

  const title = `${cat.name} — Blog`
  const description = cat.description ?? `${cat.name} kategorisindeki tüm yazılar.`
  return {
    title,
    description,
    alternates: { canonical: `/blog/kategori/${slug}` },
    openGraph: { title, description, url: `/blog/kategori/${slug}`, type: "website" },
  }
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ sayfa?: string }>
}) {
  const [{ slug }, sp] = await Promise.all([params, searchParams])
  const page = Math.max(1, parseInt(sp.sayfa ?? "1", 10) || 1)
  const from = (page - 1) * POSTS_PER_PAGE
  const to = from + POSTS_PER_PAGE - 1

  const supabase = await createClient()

  const { data: category } = await supabase
    .from("blog_categories")
    .select("id, name, slug, description")
    .eq("slug", slug)
    .maybeSingle()

  if (!category) notFound()

  const [{ data: allCategories }, { count }, { data: posts }] = await Promise.all([
    supabase.from("blog_categories").select("name, slug").order("name"),
    supabase
      .from("blog_posts")
      .select("*", { count: "exact", head: true })
      .eq("status", "published")
      .eq("category_id", category.id),
    supabase
      .from("blog_posts")
      .select(
        "slug, title, excerpt, content, cover_image_url, published_at, blog_categories(name, slug)"
      )
      .eq("status", "published")
      .eq("category_id", category.id)
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

  const basePath = `/blog/kategori/${category.slug}`

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Ana Sayfa", url: `${siteUrl}/` },
          { name: "Blog", url: `${siteUrl}/blog` },
          { name: category.name, url: `${siteUrl}${basePath}` },
        ])}
      />

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#0F1F28] via-[#143847] to-[#1B6B8A] text-white py-14 md:py-20 px-5 md:px-8 lg:px-12">
        <div className="max-w-6xl mx-auto">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-xs text-blue-100/70 mb-4"
          >
            <Link href="/blog" className="hover:text-white transition-colors">
              Blog
            </Link>
            <ChevronRight className="w-3 h-3" />
            <span>{category.name}</span>
          </nav>
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[#F97316] mb-3">
            Kategori
          </span>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight mb-3">
            {category.name}
          </h1>
          {category.description && (
            <p className="text-base text-blue-100/80 max-w-xl">{category.description}</p>
          )}
        </div>
      </section>

      <section className="border-b border-zinc-200 bg-white sticky top-16 md:top-[4.5rem] z-30">
        <div className="max-w-6xl mx-auto px-5 md:px-8 lg:px-12 py-4">
          <CategoryChips categories={allCategories ?? []} activeSlug={category.slug} />
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-5 md:px-8 lg:px-12 py-12 md:py-16">
        {safePosts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center">
            <p className="text-zinc-500 mb-3">Bu kategoride henüz yazı yok.</p>
            <Link href="/blog" className="text-[#1B6B8A] font-semibold text-sm hover:underline">
              Tüm yazılara dön
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
              {safePosts.map((p) => (
                <PostCard key={p.slug} post={p} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-12 flex items-center justify-between gap-4">
                {page > 1 ? (
                  <Link
                    href={`${basePath}${page - 1 === 1 ? "" : `?sayfa=${page - 1}`}`}
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
                {page < totalPages ? (
                  <Link
                    href={`${basePath}?sayfa=${page + 1}`}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-zinc-200 bg-white text-sm font-semibold text-zinc-700 hover:border-[#1B6B8A] hover:text-[#1B6B8A] transition-colors"
                  >
                    Sonraki
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <span className="text-sm text-zinc-400 px-4 py-2.5">Son sayfa</span>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </>
  )
}
