import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronRight, Clock, User as UserIcon, ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { Markdown } from "@/components/blog/markdown"
import { PostCover } from "@/components/blog/post-cover"
import { PostCard } from "@/components/blog/post-card"
import { ShareButtons } from "@/components/blog/share-buttons"
import { ViewCounter } from "@/components/blog/view-counter"
import { TableOfContents } from "@/components/blog/toc"
import { JsonLd } from "@/components/seo/json-ld"
import { articleSchema, breadcrumbSchema } from "@/lib/seo/schemas"
import { readingTime } from "@/lib/blog/read-time"
import { extractH2Headings } from "@/lib/blog/headings"
import { getSiteUrl } from "@/lib/site-url"

export const revalidate = 3600

const siteUrl = getSiteUrl()

const TR_DATE = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
})

export async function generateStaticParams() {
  // Build time'da çalışır — cookies/RLS context yok, service role kullan
  const supabase = supabaseAdmin()
  const { data } = await supabase
    .from("blog_posts")
    .select("slug")
    .eq("status", "published")
  return (data ?? []).map((p) => ({ slug: p.slug }))
}

async function getPost(slug: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("blog_posts")
    .select(
      `slug, title, excerpt, content, cover_image_url, published_at, updated_at,
       category_id, meta_title, meta_description, meta_keywords,
       blog_categories(name, slug),
       profiles!author_id(full_name)`
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle()
  return data
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) return { title: "Yazı bulunamadı" }

  const title = post.meta_title || post.title
  const description = post.meta_description || post.excerpt
  const ogImage = post.cover_image_url

  return {
    title,
    description,
    keywords: post.meta_keywords ?? undefined,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title,
      description,
      url: `/blog/${post.slug}`,
      type: "article",
      publishedTime: post.published_at ?? undefined,
      modifiedTime: post.updated_at ?? undefined,
      authors: post.profiles?.full_name ? [post.profiles.full_name] : undefined,
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630 }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  }
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) notFound()

  const supabase = await createClient()

  // İlgili yazılar: önce aynı kategoriden 3'e kadar çek; 3'ten azsa
  // en son yayınlanan diğer published yazılarla tamamla.
  const RELATED_LIMIT = 3
  const relatedSelect =
    "slug, title, excerpt, content, cover_image_url, published_at, blog_categories(name, slug)"

  const { data: sameCategory } = post.category_id
    ? await supabase
        .from("blog_posts")
        .select(relatedSelect)
        .eq("status", "published")
        .eq("category_id", post.category_id)
        .neq("slug", post.slug)
        .order("published_at", { ascending: false })
        .limit(RELATED_LIMIT)
    : { data: [] }

  let related = sameCategory ?? []

  if (related.length < RELATED_LIMIT) {
    const excludedSlugs = [post.slug, ...related.map((p) => p.slug)]
    const { data: fillers } = await supabase
      .from("blog_posts")
      .select(relatedSelect)
      .eq("status", "published")
      .not("slug", "in", `(${excludedSlugs.map((s) => `"${s}"`).join(",")})`)
      .order("published_at", { ascending: false })
      .limit(RELATED_LIMIT - related.length)
    related = [...related, ...(fillers ?? [])]
  }

  const minutes = readingTime(post.content)
  const headings = extractH2Headings(post.content)
  const dateStr = post.published_at ? TR_DATE.format(new Date(post.published_at)) : ""
  const authorName = post.profiles?.full_name ?? "KoçUp Akademi"
  const categoryName = post.blog_categories?.name ?? null
  const url = `${siteUrl}/blog/${post.slug}`

  const safeRelated = (related ?? []).map((p) => ({
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

  return (
    <>
      <JsonLd
        data={[
          articleSchema({
            title: post.title,
            description: post.meta_description || post.excerpt,
            slug: post.slug,
            publishedAt: post.published_at ?? new Date().toISOString(),
            updatedAt: post.updated_at ?? post.published_at ?? new Date().toISOString(),
            coverImage: post.cover_image_url,
            authorName,
            categoryName,
          }),
          breadcrumbSchema([
            { name: "Ana Sayfa", url: `${siteUrl}/` },
            { name: "Blog", url: `${siteUrl}/blog` },
            ...(post.blog_categories
              ? [
                  {
                    name: post.blog_categories.name,
                    url: `${siteUrl}/blog/kategori/${post.blog_categories.slug}`,
                  },
                ]
              : []),
            { name: post.title, url },
          ]),
        ]}
      />
      <ViewCounter slug={post.slug} />

      {/* Cover hero */}
      <section className="relative bg-gradient-to-br from-[#0F1F28] to-[#1B6B8A] text-white overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <PostCover src={post.cover_image_url} alt={post.title} priority sizes="100vw" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F1F28]/90 via-[#0F1F28]/60 to-[#0F1F28]/30" />
        <div className="relative max-w-3xl mx-auto px-5 md:px-8 lg:px-12 py-16 md:py-24">
          {/* Breadcrumb */}
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-xs text-blue-100/70 mb-5 flex-wrap"
          >
            <Link href="/" className="hover:text-white transition-colors">
              Ana Sayfa
            </Link>
            <ChevronRight className="w-3 h-3" />
            <Link href="/blog" className="hover:text-white transition-colors">
              Blog
            </Link>
            {post.blog_categories && (
              <>
                <ChevronRight className="w-3 h-3" />
                <Link
                  href={`/blog/kategori/${post.blog_categories.slug}`}
                  className="hover:text-white transition-colors"
                >
                  {post.blog_categories.name}
                </Link>
              </>
            )}
            <ChevronRight className="w-3 h-3" />
            <span
              aria-current="page"
              className="text-white/90 truncate max-w-[16rem] sm:max-w-xs md:max-w-md"
              title={post.title}
            >
              {post.title}
            </span>
          </nav>

          {categoryName && (
            <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-[#F97316] bg-orange-500/10 border border-orange-500/30 px-3 py-1 rounded-full mb-5">
              {categoryName}
            </span>
          )}
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.1] mb-6">
            {post.title}
          </h1>
          <p className="text-base md:text-lg text-blue-100/90 leading-relaxed mb-7 max-w-2xl">
            {post.excerpt}
          </p>
          <div className="flex items-center gap-5 text-sm text-blue-100/80 flex-wrap">
            <span className="flex items-center gap-2">
              <UserIcon className="w-4 h-4" />
              {authorName}
            </span>
            <span className="w-1 h-1 rounded-full bg-blue-100/40" />
            <span>{dateStr}</span>
            <span className="w-1 h-1 rounded-full bg-blue-100/40" />
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {minutes} dakika okuma
            </span>
          </div>
        </div>
      </section>

      {/* Article body */}
      <section className="max-w-3xl mx-auto px-5 md:px-8 lg:px-12 py-12 md:py-16">
        <TableOfContents headings={headings} />
        <Markdown content={post.content} />

        {/* Share */}
        <div className="mt-12 pt-8 border-t border-zinc-200">
          <ShareButtons url={url} title={post.title} />
        </div>
      </section>

      {/* Related */}
      {safeRelated.length > 0 && (
        <section className="bg-white border-t border-zinc-200 py-16 md:py-20 px-5 md:px-8 lg:px-12">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-end justify-between mb-8 gap-4">
              <div>
                <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[#F97316] mb-2">
                  Devamı
                </span>
                <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-900">
                  İlgili yazılar
                </h2>
              </div>
              <Link
                href="/blog"
                className="text-sm font-semibold text-[#1B6B8A] hover:text-[#F97316] inline-flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Tüm yazılar
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
              {safeRelated.map((p) => (
                <PostCard key={p.slug} post={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  )
}
