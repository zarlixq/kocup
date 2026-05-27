import type { MetadataRoute } from "next"
import { createClient } from "@/lib/supabase/server"
import { getSiteUrl } from "@/lib/site-url"

const baseUrl = getSiteUrl()

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${baseUrl}/basvuru`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/giris/ogrenci`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/giris/koc`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ]

  let blogPages: MetadataRoute.Sitemap = []
  let categoryPages: MetadataRoute.Sitemap = []

  try {
    const supabase = await createClient()

    const { data: posts } = await supabase
      .from("blog_posts")
      .select("slug, updated_at, published_at")
      .eq("status", "published")

    blogPages = (posts ?? []).map((p) => ({
      url: `${baseUrl}/blog/${p.slug}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : (p.published_at ? new Date(p.published_at) : now),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }))

    const { data: categories } = await supabase
      .from("blog_categories")
      .select("slug")

    categoryPages = (categories ?? []).map((c) => ({
      url: `${baseUrl}/blog/kategori/${c.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }))
  } catch {
    // Blog tabloları henüz yoksa veya hata olursa boş döndür
  }

  return [...staticPages, ...blogPages, ...categoryPages]
}
