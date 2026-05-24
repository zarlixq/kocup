"use client"

import { useState, useTransition } from "react"
import { Plus, Pencil, Trash2, BookOpen } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { SubjectDialog } from "@/components/mudur/subject-dialog"
import { TopicList, type TopicItem } from "@/components/mudur/topic-list"
import { deleteSubject } from "@/app/mudur/mufredat/actions"
import { cn } from "@/lib/utils"

export type SubjectItem = {
  id: string
  name: string
  exam_type: string
  color: string
  order: number
  topic_count: number
}

type Props = {
  subjects: SubjectItem[]
  topicsBySubject: Record<string, TopicItem[]>
}

export function CurriculumView({ subjects, topicsBySubject }: Props) {
  const [isPending, startTransition] = useTransition()
  const [activeId, setActiveId] = useState<string | null>(subjects[0]?.id ?? null)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<SubjectItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SubjectItem | null>(null)

  const active = subjects.find((s) => s.id === activeId) ?? null
  const activeTopics = active ? topicsBySubject[active.id] ?? [] : []

  const nextOrder =
    subjects.length > 0 ? Math.max(...subjects.map((s) => s.order)) + 1 : 1

  function handleDeleteSubject() {
    if (!deleteTarget) return
    startTransition(async () => {
      const result = await deleteSubject(deleteTarget.id)
      if (result.success) {
        toast.success("Ders silindi.")
        if (activeId === deleteTarget.id) {
          const remaining = subjects.filter((s) => s.id !== deleteTarget.id)
          setActiveId(remaining[0]?.id ?? null)
        }
        setDeleteTarget(null)
      } else {
        toast.error(result.error ?? "Silinemedi.")
      }
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
      {/* Left: subject list */}
      <aside className="bg-white border border-zinc-200 rounded-2xl p-3">
        <div className="flex items-center justify-between px-2 py-2 mb-2">
          <h2 className="font-semibold text-zinc-900">Dersler</h2>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 border-[#1B6B8A] text-[#1B6B8A] hover:bg-[#1B6B8A] hover:text-white"
            onClick={() => setShowAdd(true)}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Ders
          </Button>
        </div>

        {subjects.length === 0 ? (
          <div className="p-6 text-center text-sm text-zinc-500">
            Henüz ders eklenmemiş.
          </div>
        ) : (
          <ul className="space-y-1">
            {subjects.map((s) => {
              const isActive = s.id === activeId
              return (
                <li key={s.id}>
                  <button
                    onClick={() => setActiveId(s.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                      isActive
                        ? "bg-blue-50 border border-[#1B6B8A]"
                        : "hover:bg-zinc-50 border border-transparent"
                    )}
                  >
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: s.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-zinc-900 text-sm truncate">
                        {s.name}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {s.topic_count} konu
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {s.exam_type}
                    </Badge>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </aside>

      {/* Right: topics */}
      <section className="bg-white border border-zinc-200 rounded-2xl p-5">
        {!active ? (
          <div className="p-12 text-center">
            <BookOpen className="w-10 h-10 text-zinc-300 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">
              Sol taraftan bir ders seçin veya yeni bir ders ekleyin.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <span
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: active.color }}
                />
                <h2 className="text-lg font-bold text-zinc-900">{active.name}</h2>
                <Badge variant="outline">{active.exam_type}</Badge>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditing(active)}>
                  <Pencil className="w-3.5 h-3.5 mr-1" />
                  Düzenle
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteTarget(active)}
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Sil
                </Button>
              </div>
            </div>

            <TopicList subjectId={active.id} topics={activeTopics} />
          </>
        )}
      </section>

      <SubjectDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        defaultOrder={nextOrder}
      />

      <SubjectDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        initial={editing}
        defaultOrder={nextOrder}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dersi sil?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium">{deleteTarget?.name}</span> ve içindeki{" "}
              {deleteTarget?.topic_count ?? 0} konu birlikte silinecek. Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSubject}
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
