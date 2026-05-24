import { createClient } from "@/lib/supabase/server"
import { PostForm } from "@/components/mudur/blog/post-form"

export default async function NewBlogPostPage() {
  const supabase = await createClient()
  const { data: categories } = await supabase
    .from("blog_categories")
    .select("id, name")
    .order("name")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-900">
          Yeni Yazı
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Markdown editör ile içerik yaz, taslak kaydet veya hemen yayınla.
        </p>
      </div>
      <PostForm mode="create" categories={categories ?? []} />
    </div>
  )
}
