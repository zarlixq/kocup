"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { useActionState, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import Image from "next/image"
import { Save, FileText, Send, Trash2, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { createPost, updatePost, deletePostAndRedirect } from "@/app/mudur/blog/actions"
import { slugify } from "@/lib/slug"

const MDEditor = dynamic(
  () => import("@uiw/react-md-editor").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="h-96 rounded-lg border border-zinc-200 bg-zinc-50 flex items-center justify-center text-sm text-zinc-400">
        Markdown editör yükleniyor…
      </div>
    ),
  }
)

type Category = { id: string; name: string }

type Post = {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  cover_image_url: string | null
  category_id: string | null
  status: "draft" | "published" | "archived"
  meta_title: string | null
  meta_description: string | null
  meta_keywords: string[] | null
}

type Props = {
  mode: "create" | "edit"
  categories: Category[]
  post?: Post
}

export function PostForm({ mode, categories, post }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(post?.title ?? "")
  const [slug, setSlug] = useState(post?.slug ?? "")
  const [slugTouched, setSlugTouched] = useState(mode === "edit")
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "")
  const [content, setContent] = useState(post?.content ?? "")
  const [coverImageUrl, setCoverImageUrl] = useState(post?.cover_image_url ?? "")
  const [categoryId, setCategoryId] = useState(post?.category_id ?? "")
  const [status, setStatus] = useState<Post["status"]>(post?.status ?? "draft")
  const [metaTitle, setMetaTitle] = useState(post?.meta_title ?? "")
  const [metaDescription, setMetaDescription] = useState(post?.meta_description ?? "")
  const [metaKeywords, setMetaKeywords] = useState(
    post?.meta_keywords?.join(", ") ?? ""
  )

  // Auto-slug
  useEffect(() => {
    if (slugTouched) return
    setSlug(slugify(title))
  }, [title, slugTouched])

  const submitAction = useMemo(() => {
    if (mode === "edit" && post) {
      return updatePost.bind(null, post.id)
    }
    return createPost
  }, [mode, post])

  const [state, formAction, pending] = useActionState(submitAction, undefined)

  useEffect(() => {
    if (!state) return
    if (state.success) {
      toast.success(mode === "create" ? "Yazı oluşturuldu" : "Yazı güncellendi")
      if (mode === "create" && state.id) {
        router.push(`/mudur/blog/${state.id}/duzenle`)
      } else {
        router.refresh()
      }
    } else if (state.error) {
      toast.error(state.error)
    }
  }, [state, mode, router])

  const isPreviewable = coverImageUrl && /^https?:\/\//.test(coverImageUrl)

  return (
    <form action={formAction} className="space-y-6">
      {/* Üst aksiyonlar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link
          href="/mudur/blog"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Tüm yazılar
        </Link>
        <div className="flex items-center gap-2">
          {mode === "edit" && post && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700">
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  Sil
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Bu yazıyı silmek istediğinden emin misin?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Bu işlem geri alınamaz. Yazı kalıcı olarak silinecek.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deletePostAndRedirect(post.id)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Evet, sil
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button
            type="submit"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => setStatus("draft")}
          >
            <FileText className="w-4 h-4 mr-1.5" />
            Taslak Kaydet
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={pending}
            onClick={() => setStatus("published")}
            className="bg-[#1B6B8A] hover:bg-[#155873]"
          >
            <Send className="w-4 h-4 mr-1.5" />
            {status === "published" ? "Güncelle" : "Yayınla"}
          </Button>
        </div>
      </div>

      {/* Hidden controlled values */}
      <input type="hidden" name="content" value={content} />
      <input type="hidden" name="status" value={status} />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        {/* Left: main fields + editor */}
        <div className="space-y-6">
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4">
            <div>
              <Label htmlFor="title" className="text-sm font-semibold">
                Başlık <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                name="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Örn: YKS'ye nasıl hazırlanılır?"
                required
                className="mt-1.5 text-base"
              />
            </div>

            <div>
              <Label htmlFor="slug" className="text-sm font-semibold">
                Slug <span className="text-red-500">*</span>
              </Label>
              <Input
                id="slug"
                name="slug"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true)
                  setSlug(e.target.value)
                }}
                placeholder="yks-yol-haritasi"
                required
                className="mt-1.5 font-mono text-sm"
              />
              <p className="text-xs text-zinc-500 mt-1">
                URL: /blog/<span className="font-semibold text-zinc-700">{slug || "..."}</span>
              </p>
            </div>

            <div>
              <Label htmlFor="excerpt" className="text-sm font-semibold">
                Özet <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="excerpt"
                name="excerpt"
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Yazının kısa özeti (160 karakter civarı)"
                rows={3}
                required
                className="mt-1.5"
              />
              <p className="text-xs text-zinc-500 mt-1">{excerpt.length} / 300 karakter</p>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl p-6">
            <Label className="text-sm font-semibold mb-3 block">
              İçerik (Markdown) <span className="text-red-500">*</span>
            </Label>
            <div data-color-mode="light">
              <MDEditor
                value={content}
                onChange={(val) => setContent(val ?? "")}
                height={500}
                preview="live"
              />
            </div>
          </div>

          {/* SEO */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
              SEO <span className="text-xs font-normal text-zinc-400">(opsiyonel)</span>
            </h3>
            <div>
              <Label htmlFor="meta_title" className="text-xs font-semibold text-zinc-600">
                Meta Title
              </Label>
              <Input
                id="meta_title"
                name="meta_title"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                placeholder="Boşsa başlık kullanılır"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="meta_description" className="text-xs font-semibold text-zinc-600">
                Meta Description
              </Label>
              <Textarea
                id="meta_description"
                name="meta_description"
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder="Boşsa özet kullanılır"
                rows={2}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="meta_keywords" className="text-xs font-semibold text-zinc-600">
                Anahtar Kelimeler
              </Label>
              <Input
                id="meta_keywords"
                name="meta_keywords"
                value={metaKeywords}
                onChange={(e) => setMetaKeywords(e.target.value)}
                placeholder="virgülle ayır: YKS, eğitim koçluğu, TYT"
                className="mt-1.5"
              />
            </div>
          </div>
        </div>

        {/* Right: sidebar */}
        <div className="space-y-6">
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4">
            <div>
              <Label htmlFor="status_select" className="text-sm font-semibold">
                Durum
              </Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Post["status"])}>
                <SelectTrigger id="status_select" className="mt-1.5 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Taslak</SelectItem>
                  <SelectItem value="published">Yayında</SelectItem>
                  <SelectItem value="archived">Arşivlenmiş</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="category_select" className="text-sm font-semibold">
                Kategori
              </Label>
              <Select
                value={categoryId || "__none__"}
                onValueChange={(v) => setCategoryId(v === "__none__" ? "" : v)}
              >
                <SelectTrigger id="category_select" className="mt-1.5 w-full">
                  <SelectValue placeholder="Kategori seç" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Kategori yok —</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="category_id" value={categoryId} />
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-3">
            <div>
              <Label htmlFor="cover_image_url" className="text-sm font-semibold">
                Kapak Görseli URL
              </Label>
              <Input
                id="cover_image_url"
                name="cover_image_url"
                type="url"
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="mt-1.5 font-mono text-xs"
              />
              <p className="text-xs text-zinc-500 mt-1">
                Unsplash veya Pexels gibi servislerden URL kullan. Önerilen: 1200×630.
              </p>
            </div>
            {isPreviewable && (
              <div className="relative w-full aspect-[16/10] rounded-lg overflow-hidden border border-zinc-200 bg-zinc-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverImageUrl}
                  alt="Önizleme"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5 text-xs text-zinc-600 space-y-1">
            <p className="font-semibold text-zinc-900 mb-1.5">İpucu</p>
            <p>• "Taslak Kaydet" status'ü taslağa çevirir ve kaydeder.</p>
            <p>• "Yayınla" status'ü yayına alır. İlk yayında published_at otomatik set edilir.</p>
            <p>• Slug başlıktan otomatik üretilir. Manuel düzenlersen, başlık değişse bile sabit kalır.</p>
          </div>
        </div>
      </div>
    </form>
  )
}
