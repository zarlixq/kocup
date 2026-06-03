import type { MetadataRoute } from "next"
import { createClient } from "@/lib/supabase/server"
import { getSiteUrl } from "@/lib/site-url"
import { TOOLS } from "@/lib/tools/config"

const baseUrl = getSiteUrl()

// NOT — kaldırılanlar ve neden:
//   /#fiyatlar, /#koclarimiz, /#nasil-calisir, /#sss, /#iletisim:
//     Fragment'lar bağımsız indexlenebilir URL değil — Google Search Console
//     "Tanıyamadığımız bir giriş" uyarısı verir.
//   blog girişlerinde `images: [cover_image_url]`:
//     Next.js sitemap renderer'ı image URL'lerini XML escape ETMİYOR; query
//     string'deki `&` karakterleri (örn. Unsplash w=1200&h=630) parse hatası
//     veriyor. Image sitemap'leri Google için zaten opsiyonel — ekstra bilgi
//     olarak; çıkarmak indexlenmeyi etkilemez.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${baseUrl}/basvuru`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/araclar`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    ...TOOLS.map((t) => ({
      url: `${baseUrl}${t.publicPath}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    { url: `${baseUrl}/giris/ogrenci`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: `${baseUrl}/giris/koc`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
  ]

  let blogPages: MetadataRoute.Sitemap = []
  let categoryPages: MetadataRoute.Sitemap = []

  try {
    const supabase = await createClient()

    const { data: posts } = await supabase
      .from("blog_posts")
      .select("slug, updated_at, published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false })

    blogPages = (posts ?? [])
      .filter((p) => typeof p.slug === "string" && p.slug.length > 0)
      .map((p) => ({
        url: `${baseUrl}/blog/${p.slug}`,
        lastModified: p.updated_at
          ? new Date(p.updated_at)
          : p.published_at
            ? new Date(p.published_at)
            : now,
        changeFrequency: "monthly" as const,
        priority: 0.7,
      }))

    const { data: categories } = await supabase
      .from("blog_categories")
      .select("slug")

    categoryPages = (categories ?? [])
      .filter((c) => typeof c.slug === "string" && c.slug.length > 0)
      .map((c) => ({
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
