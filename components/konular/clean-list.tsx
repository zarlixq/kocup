"use client"

import { useMemo, useState, useTransition } from "react"
import { Trash2, BookOpen } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { cn } from "@/lib/utils"
import { TopicStatusSegments } from "@/components/konular/topic-status-segments"
import {
  STATUS_LIST,
  type Status,
  type TopicCard,
} from "@/components/konular/types"
import { removeTopic } from "@/app/koc/ogrenciler/[id]/konular/actions"

type Props = {
  studentId: string
  cards: TopicCard[]
}

type Filter = "all" | Status

const STATUS_ORDER: Record<Status, number> = { devam: 0, tekrar: 1, basla: 2, tamam: 3 }

export function CleanList({ studentId, cards }: Props) {
  const [filter, setFilter] = useState<Filter>("all")
  const [deleteTarget, setDeleteTarget] = useState<TopicCard | null>(null)
  const [pending, startTransition] = useTransition()

  const counts = useMemo(() => {
    const c: Record<Status, number> = { basla: 0, devam: 0, tamam: 0, tekrar: 0 }
    for (const t of cards) c[t.status]++
    return c
  }, [cards])

  const filtered = useMemo(() => {
    if (filter === "all") return cards
    return cards.filter((c) => c.status === filter)
  }, [cards, filter])

  const grouped = useMemo(() => {
    const map = new Map<string, TopicCard[]>()
    for (const c of filtered) {
      const list = map.get(c.subjectName) ?? []
      list.push(c)
      map.set(c.subjectName, list)
    }
    for (const list of map.values()) {
      list.sort((x, y) => STATUS_ORDER[x.status] - STATUS_ORDER[y.status])
    }
    return Array.from(map.entries()).sort(([a], [b]) =>
      a.localeCompare(b, "tr"),
    )
  }, [filtered])

  function handleDelete() {
    if (!deleteTarget) return
    startTransition(async () => {
      const res = await removeTopic(studentId, deleteTarget.id)
      if (res.success) {
        toast.success("Konu kaldırıldı.")
        setDeleteTarget(null)
      } else {
        toast.error(res.error ?? "Silinemedi.")
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Üst filtre kartları */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
        <FilterCard
          active={filter === "all"}
          onClick={() => setFilter("all")}
          label="Tümü"
          count={cards.length}
          tone="bg-white text-zinc-700 hover:bg-zinc-50"
          activeRing="ring-[#1B6B8A] text-[#1B6B8A]"
          dot="bg-zinc-400"
        />
        {STATUS_LIST.map((s) => (
          <FilterCard
            key={s.value}
            active={filter === s.value}
            onClick={() => setFilter(s.value)}
            label={s.label}
            count={counts[s.value]}
            tone={`${s.tone} hover:opacity-80`}
            activeRing={`ring-current ${s.ring}`}
            dot={s.dot}
          />
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center">
          <BookOpen className="h-6 w-6 text-zinc-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-zinc-900 mb-1">
            {cards.length === 0
              ? "Henüz konu atanmamış"
              : "Bu filtreyle konu bulunamadı"}
          </h3>
          <p className="text-sm text-zinc-500">
            {cards.length === 0
              ? "Sağ üstten konu ata."
              : "Filtreyi değiştirmeyi dene."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([subjectName, list]) => (
            <div
              key={subjectName}
              className="bg-white border border-zinc-200 rounded-2xl overflow-hidden"
            >
              <div className="bg-zinc-50 px-4 py-2.5 border-b border-zinc-200 flex items-center justify-between">
                <span className="text-sm font-semibold text-zinc-700">
                  {subjectName}
                </span>
                <Badge variant="outline">{list.length}</Badge>
              </div>
              <ul className="divide-y divide-zinc-100">
                {list.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center gap-3 px-4 py-2.5"
                  >
                    <div className="flex-1 min-w-0">
                      <div
                        className={cn(
                          "text-sm",
                          c.status === "tamam"
                            ? "text-zinc-400 line-through"
                            : "text-zinc-900",
                        )}
                      >
                        {c.topicName}
                        {c.isCustom && (
                          <Badge variant="outline" className="ml-2 text-[10px]">
                            Özel
                          </Badge>
                        )}
                      </div>
                    </div>
                    <TopicStatusSegments
                      studentId={studentId}
                      trackingId={c.id}
                      status={c.status}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setDeleteTarget(c)}
                      aria-label="Konuyu kaldır"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && !pending && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konuyu kaldır?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium">{deleteTarget?.topicName}</span>{" "}
              öğrenciden kaldırılacak. Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={pending}
              className="bg-red-600 hover:bg-red-700"
            >
              {pending ? "Siliniyor..." : "Evet, kaldır"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function FilterCard({
  active,
  onClick,
  label,
  count,
  tone,
  activeRing,
  dot,
}: {
  active: boolean
  onClick: () => void
  label: string
  count: number
  tone: string
  activeRing: string
  dot: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-zinc-200 transition-all text-left",
        tone,
        active && `ring-2 ${activeRing}`,
      )}
    >
      <span className="inline-flex items-center gap-2 text-sm font-medium truncate">
        <span className={cn("h-2 w-2 rounded-full shrink-0", dot)} />
        {label}
      </span>
      <span className="tabular-nums text-sm font-semibold">{count}</span>
    </button>
  )
}
