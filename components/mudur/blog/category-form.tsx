"use client"

import { useActionState, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createCategory, updateCategory } from "@/app/mudur/blog/actions"
import { slugify } from "@/lib/slug"

type Props = {
  mode: "create" | "edit"
  category?: { id: string; name: string; slug: string; description: string | null }
  onDone?: () => void
}

export function CategoryForm({ mode, category, onDone }: Props) {
  const router = useRouter()
  const [name, setName] = useState(category?.name ?? "")
  const [slug, setSlug] = useState(category?.slug ?? "")
  const [slugTouched, setSlugTouched] = useState(mode === "edit")
  const [description, setDescription] = useState(category?.description ?? "")

  useEffect(() => {
    if (!slugTouched) setSlug(slugify(name))
  }, [name, slugTouched])

  const action = mode === "edit" && category
    ? updateCategory.bind(null, category.id)
    : createCategory

  const [state, formAction, pending] = useActionState(action, undefined)

  useEffect(() => {
    if (!state) return
    if (state.success) {
      toast.success(mode === "create" ? "Kategori oluşturuldu" : "Kategori güncellendi")
      onDone?.()
      router.refresh()
    } else if (state.error) {
      toast.error(state.error)
    }
  }, [state, mode, router, onDone])

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="cat_name" className="text-sm font-semibold">
          Ad <span className="text-red-500">*</span>
        </Label>
        <Input
          id="cat_name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Örn: Sınav Hazırlık"
          required
          className="mt-1.5"
        />
      </div>
      <div>
        <Label htmlFor="cat_slug" className="text-sm font-semibold">
          Slug <span className="text-red-500">*</span>
        </Label>
        <Input
          id="cat_slug"
          name="slug"
          value={slug}
          onChange={(e) => {
            setSlugTouched(true)
            setSlug(e.target.value)
          }}
          placeholder="sinav-hazirlik"
          required
          className="mt-1.5 font-mono text-sm"
        />
      </div>
      <div>
        <Label htmlFor="cat_desc" className="text-sm font-semibold">
          Açıklama
        </Label>
        <Textarea
          id="cat_desc"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Kategori açıklaması (opsiyonel)"
          rows={2}
          className="mt-1.5"
        />
      </div>
      <Button type="submit" disabled={pending} className="w-full bg-[#1B6B8A] hover:bg-[#155873]">
        <Save className="w-4 h-4 mr-1.5" />
        {mode === "create" ? "Oluştur" : "Güncelle"}
      </Button>
    </form>
  )
}
