import Link from "next/link"
import { ArrowLeft, Plus } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { CategoriesView } from "@/components/mudur/blog/categories-view"

export default async function BlogCategoriesPage() {
  const supabase = await createClient()
  const { data: categories } = await supabase
    .from("blog_categories")
    .select("id, name, slug, description, created_at")
    .order("name")

  // Her kategorideki post sayısı için ayrı bir aggregate
  const { data: postCounts } = await supabase
    .from("blog_posts")
    .select("category_id")

  const countsMap = new Map<string, number>()
  for (const row of postCounts ?? []) {
    if (row.category_id) {
      countsMap.set(row.category_id, (countsMap.get(row.category_id) ?? 0) + 1)
    }
  }

  const enriched = (categories ?? []).map((c) => ({
    ...c,
    post_count: countsMap.get(c.id) ?? 0,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <Link
            href="/mudur/blog"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Yazılara dön
          </Link>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-900">
            Blog Kategorileri
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Toplam {enriched.length} kategori.
          </p>
        </div>
      </div>

      <CategoriesView categories={enriched} />
    </div>
  )
}
