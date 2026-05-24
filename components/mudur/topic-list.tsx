"use client"

import { useState, useTransition } from "react"
import { Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { createTopic, deleteTopic, updateTopic } from "@/app/mudur/mufredat/actions"

export type TopicItem = { id: string; name: string; order: number }

type Props = {
  subjectId: string
  topics: TopicItem[]
}

export function TopicList({ subjectId, topics }: Props) {
  const [isPending, startTransition] = useTransition()
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<TopicItem | null>(null)

  const nextOrder = topics.length > 0 ? Math.max(...topics.map((t) => t.order)) + 1 : 1

  function handleAdd() {
    if (newName.trim().length < 2) {
      toast.error("Konu adı en az 2 karakter olmalı.")
      return
    }
    startTransition(async () => {
      const result = await createTopic(subjectId, { name: newName.trim(), order: nextOrder })
      if (result.success) {
        toast.success("Konu eklendi.")
        setNewName("")
        setShowAdd(false)
      } else {
        toast.error(result.error ?? "Eklenemedi.")
      }
    })
  }

  function handleEditSave(topic: TopicItem) {
    const trimmed = editName.trim()
    if (trimmed === topic.name) {
      setEditingId(null)
      return
    }
    if (trimmed.length < 2) {
      toast.error("Konu adı en az 2 karakter olmalı.")
      setEditingId(null)
      return
    }
    startTransition(async () => {
      const result = await updateTopic(topic.id, { name: trimmed })
      if (result.success) {
        toast.success("Konu güncellendi.")
        setEditingId(null)
      } else {
        toast.error(result.error ?? "Güncellenemedi.")
      }
    })
  }

  function handleDelete() {
    if (!deleteTarget) return
    startTransition(async () => {
      const result = await deleteTopic(deleteTarget.id)
      if (result.success) {
        toast.success("Konu silindi.")
        setDeleteTarget(null)
      } else {
        toast.error(result.error ?? "Silinemedi.")
      }
    })
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowAdd(true)}
          className="border-[#1B6B8A] text-[#1B6B8A] hover:bg-[#1B6B8A] hover:text-white"
        >
          <Plus className="w-4 h-4 mr-1" />
          Konu Ekle
        </Button>
      </div>

      {topics.length === 0 ? (
        <div className="bg-zinc-50 border border-dashed border-zinc-200 rounded-xl p-8 text-center">
          <p className="text-sm text-zinc-500">Bu derste henüz konu yok.</p>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {topics.map((t) => (
            <li
              key={t.id}
              className="group flex items-center gap-3 bg-white border border-zinc-200 rounded-lg px-3 py-2 hover:border-zinc-300"
            >
              <span className="w-8 text-xs font-mono text-zinc-400 tabular-nums">
                {t.order}.
              </span>
              {editingId === t.id ? (
                <Input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={() => handleEditSave(t)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleEditSave(t)
                    if (e.key === "Escape") setEditingId(null)
                  }}
                  className="flex-1 h-7 text-sm"
                />
              ) : (
                <span
                  onDoubleClick={() => {
                    setEditingId(t.id)
                    setEditName(t.name)
                  }}
                  className="flex-1 text-sm text-zinc-900 cursor-text"
                  title="Düzenlemek için çift tıklayın"
                >
                  {t.name}
                </span>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={() => setDeleteTarget(t)}
                aria-label="Sil"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Konu</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="topic-name">Konu Adı</Label>
            <Input
              id="topic-name"
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Türev"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd()
              }}
            />
            <p className="text-xs text-zinc-400">Sıra: {nextOrder}</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAdd(false)} disabled={isPending}>
              Vazgeç
            </Button>
            <Button
              className="bg-[#1B6B8A] hover:bg-[#155a75]"
              onClick={handleAdd}
              disabled={isPending}
            >
              {isPending ? "Ekleniyor..." : "Ekle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konuyu sil?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium">{deleteTarget?.name}</span> silinecek. Bu konuya bağlı öğrenci takipleri varsa silme engellenecek.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {isPending ? "Siliniyor..." : "Evet, sil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
