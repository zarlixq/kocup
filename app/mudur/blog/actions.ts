"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { slugify } from "@/lib/slug"
import type { Database } from "@/lib/database.types"

type BlogPostStatus = Database["public"]["Enums"]["blog_post_status"]

const STATUS_VALUES = ["draft", "published", "archived"] as const

const PostSchema = z.object({
  title: z.string().trim().min(3, "Başlık en az 3 karakter olmalı"),
  slug: z.string().trim().min(3, "Slug en az 3 karakter olmalı"),
  excerpt: z.string().trim().min(20, "Özet en az 20 karakter olmalı").max(300, "Özet 300 karakteri geçemez"),
  content: z.string().trim().min(50, "İçerik en az 50 karakter olmalı"),
  cover_image_url: z.string().trim().url("Geçerli bir URL girin").or(z.literal("")).optional().transform((v) => v || null),
  category_id: z.string().trim().uuid().or(z.literal("")).optional().transform((v) => v || null),
  status: z.enum(STATUS_VALUES),
  meta_title: z.string().trim().optional().transform((v) => v || null),
  meta_description: z.string().trim().optional().transform((v) => v || null),
  meta_keywords: z.string().trim().optional().transform((v) => {
    if (!v) return null
    return v.split(",").map((s) => s.trim()).filter(Boolean)
  }),
})

type ActionResult = { success: boolean; error?: string; id?: string }

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: "Yetkisiz" }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()
  if (profile?.role !== "admin") return { ok: false as const, error: "Yetkisiz" }
  return { ok: true as const, supabase, userId: user.id }
}

async function ensureUniqueSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  base: string,
  excludeId?: string
): Promise<string> {
  let slug = base || "yazi"
  for (let i = 0; i < 50; i++) {
    let q = supabase.from("blog_posts").select("id").eq("slug", slug)
    if (excludeId) q = q.neq("id", excludeId)
    const { data } = await q.maybeSingle()
    if (!data) return slug
    slug = `${base}-${i + 2}`
  }
  return `${base}-${Date.now()}`
}

export async function createPost(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, error: auth.error }

  const raw = Object.fromEntries(formData)
  const parsed = PostSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Form hatası" }
  }

  const slug = await ensureUniqueSlug(auth.supabase, slugify(parsed.data.slug))
  const status = parsed.data.status as BlogPostStatus
  const publishedAt = status === "published" ? new Date().toISOString() : null

  const { data, error } = await auth.supabase
    .from("blog_posts")
    .insert({
      title: parsed.data.title,
      slug,
      excerpt: parsed.data.excerpt,
      content: parsed.data.content,
      cover_image_url: parsed.data.cover_image_url,
      category_id: parsed.data.category_id,
      author_id: auth.userId,
      status,
      published_at: publishedAt,
      meta_title: parsed.data.meta_title,
      meta_description: parsed.data.meta_description,
      meta_keywords: parsed.data.meta_keywords,
    })
    .select("id")
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath("/blog")
  revalidatePath(`/blog/${slug}`)
  revalidatePath("/mudur/blog")
  return { success: true, id: data.id }
}

export async function updatePost(
  postId: string,
  _prev: unknown,
  formData: FormData
): Promise<ActionResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, error: auth.error }

  const raw = Object.fromEntries(formData)
  const parsed = PostSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Form hatası" }
  }

  // Mevcut post'u al (eski slug ve published_at için)
  const { data: existing } = await auth.supabase
    .from("blog_posts")
    .select("slug, published_at, status")
    .eq("id", postId)
    .maybeSingle()
  if (!existing) return { success: false, error: "Yazı bulunamadı" }

  const newSlugBase = slugify(parsed.data.slug)
  const slug =
    newSlugBase === existing.slug
      ? existing.slug
      : await ensureUniqueSlug(auth.supabase, newSlugBase, postId)

  const status = parsed.data.status as BlogPostStatus
  const publishedAt =
    status === "published" && !existing.published_at
      ? new Date().toISOString()
      : existing.published_at

  const { error } = await auth.supabase
    .from("blog_posts")
    .update({
      title: parsed.data.title,
      slug,
      excerpt: parsed.data.excerpt,
      content: parsed.data.content,
      cover_image_url: parsed.data.cover_image_url,
      category_id: parsed.data.category_id,
      status,
      published_at: publishedAt,
      meta_title: parsed.data.meta_title,
      meta_description: parsed.data.meta_description,
      meta_keywords: parsed.data.meta_keywords,
    })
    .eq("id", postId)

  if (error) return { success: false, error: error.message }

  revalidatePath("/blog")
  revalidatePath(`/blog/${slug}`)
  if (existing.slug !== slug) revalidatePath(`/blog/${existing.slug}`)
  revalidatePath("/mudur/blog")
  return { success: true, id: postId }
}

export async function deletePost(postId: string): Promise<ActionResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, error: auth.error }

  const { data: existing } = await auth.supabase
    .from("blog_posts")
    .select("slug")
    .eq("id", postId)
    .maybeSingle()

  const { error } = await auth.supabase.from("blog_posts").delete().eq("id", postId)
  if (error) return { success: false, error: error.message }

  revalidatePath("/blog")
  if (existing?.slug) revalidatePath(`/blog/${existing.slug}`)
  revalidatePath("/mudur/blog")
  return { success: true }
}

// ─── Categories ───────────────────────────────────────────────────────────

const CategorySchema = z.object({
  name: z.string().trim().min(2, "Ad en az 2 karakter olmalı"),
  slug: z.string().trim().min(2, "Slug en az 2 karakter olmalı"),
  description: z.string().trim().optional().transform((v) => v || null),
})

export async function createCategory(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, error: auth.error }

  const parsed = CategorySchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Form hatası" }
  }

  const slug = slugify(parsed.data.slug)

  const { data: existing } = await auth.supabase
    .from("blog_categories")
    .select("id")
    .eq("slug", slug)
    .maybeSingle()
  if (existing) return { success: false, error: "Bu slug zaten kullanımda" }

  const { error } = await auth.supabase.from("blog_categories").insert({
    name: parsed.data.name,
    slug,
    description: parsed.data.description,
  })
  if (error) return { success: false, error: error.message }

  revalidatePath("/blog")
  revalidatePath("/mudur/blog/kategoriler")
  return { success: true }
}

export async function updateCategory(
  categoryId: string,
  _prev: unknown,
  formData: FormData
): Promise<ActionResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, error: auth.error }

  const parsed = CategorySchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Form hatası" }
  }

  const slug = slugify(parsed.data.slug)

  const { data: clash } = await auth.supabase
    .from("blog_categories")
    .select("id")
    .eq("slug", slug)
    .neq("id", categoryId)
    .maybeSingle()
  if (clash) return { success: false, error: "Bu slug başka bir kategoride kullanılıyor" }

  const { error } = await auth.supabase
    .from("blog_categories")
    .update({
      name: parsed.data.name,
      slug,
      description: parsed.data.description,
    })
    .eq("id", categoryId)
  if (error) return { success: false, error: error.message }

  revalidatePath("/blog")
  revalidatePath("/mudur/blog/kategoriler")
  return { success: true }
}

export async function deleteCategory(categoryId: string): Promise<ActionResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, error: auth.error }

  const { error } = await auth.supabase.from("blog_categories").delete().eq("id", categoryId)
  if (error) return { success: false, error: error.message }

  revalidatePath("/blog")
  revalidatePath("/mudur/blog/kategoriler")
  return { success: true }
}

export async function deletePostAndRedirect(postId: string) {
  const r = await deletePost(postId)
  if (r.success) redirect("/mudur/blog")
}
