import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { PostForm } from "@/components/mudur/blog/post-form"

export default async function EditBlogPostPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: post }, { data: categories }] = await Promise.all([
    supabase
      .from("blog_posts")
      .select(
        "id, title, slug, excerpt, content, cover_image_url, category_id, status, meta_title, meta_description, meta_keywords"
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("blog_categories").select("id, name").order("name"),
  ])

  if (!post) notFound()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-900">
          Yazıyı Düzenle
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Değişikliklerden sonra "Güncelle" veya "Taslak Kaydet" basın.
        </p>
      </div>
      <PostForm mode="edit" post={post} categories={categories ?? []} />
    </div>
  )
}
