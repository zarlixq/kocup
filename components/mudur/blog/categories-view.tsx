"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import { CategoryForm } from "./category-form"
import { deleteCategory } from "@/app/mudur/blog/actions"

type Category = {
  id: string
  name: string
  slug: string
  description: string | null
  created_at: string
  post_count: number
}

export function CategoriesView({ categories }: { categories: Category[] }) {
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)

  async function onDelete(id: string) {
    const r = await deleteCategory(id)
    if (r.success) toast.success("Kategori silindi")
    else toast.error(r.error ?? "Silinemedi")
  }

  return (
    <>
      <div className="flex justify-end">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-[#1B6B8A] hover:bg-[#155873]">
              <Plus className="w-4 h-4 mr-1.5" />
              Yeni Kategori
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yeni Kategori</DialogTitle>
              <DialogDescription>Yeni bir blog kategorisi oluştur.</DialogDescription>
            </DialogHeader>
            <CategoryForm mode="create" onDone={() => setCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.length === 0 ? (
          <div className="md:col-span-2 lg:col-span-3 bg-white border border-zinc-200 rounded-2xl p-10 text-center text-sm text-zinc-500">
            Henüz kategori yok.
          </div>
        ) : (
          categories.map((c) => (
            <div
              key={c.id}
              className="bg-white border border-zinc-200 rounded-2xl p-5 flex flex-col"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-bold text-zinc-900">{c.name}</h3>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#F97316] bg-orange-50 px-2 py-0.5 rounded">
                  {c.post_count} yazı
                </span>
              </div>
              <div className="text-xs text-zinc-400 font-mono mb-2">/{c.slug}</div>
              {c.description && (
                <p className="text-sm text-zinc-500 leading-relaxed line-clamp-2 mb-4">
                  {c.description}
                </p>
              )}
              <div className="mt-auto flex items-center gap-2 pt-3 border-t border-zinc-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setEditing(c)}
                >
                  <Pencil className="w-3.5 h-3.5 mr-1.5" />
                  Düzenle
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Kategoriyi sil?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {c.post_count > 0
                          ? `Bu kategoride ${c.post_count} yazı var. Silersen yazılar "Kategorisiz" duruma geçer (silinmez).`
                          : "Bu işlem geri alınamaz."}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDelete(c.id)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Evet, sil
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kategori Düzenle</DialogTitle>
            <DialogDescription>
              Slug değiştirirsen, kategori URL'i de değişir.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <CategoryForm mode="edit" category={editing} onDone={() => setEditing(null)} />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
