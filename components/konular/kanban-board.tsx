"use client"

import { useMemo, useState, useTransition } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { useDraggable } from "@dnd-kit/core"
import { Trash2 } from "lucide-react"
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
import {
  STATUS_LIST,
  type Status,
  type TopicCard,
} from "@/components/konular/types"
import {
  updateTopicStatus,
  removeTopic,
} from "@/app/koc/ogrenciler/[id]/konular/actions"

type Props = {
  studentId: string
  cards: TopicCard[]
}

export function KanbanBoard({ studentId, cards: initialCards }: Props) {
  // Local cards: drag-drop sırasında optimistic update için. Server'a kayıt
  // gönderilir, başarısız olursa eski state'e geri al.
  const [cards, setCards] = useState<TopicCard[]>(initialCards)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TopicCard | null>(null)
  const [, startTransition] = useTransition()
  const [deletePending, setDeletePending] = useState(false)
  const [mobileStatus, setMobileStatus] = useState<Status>("devam")

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  )

  const byStatus = useMemo(() => {
    const map: Record<Status, TopicCard[]> = { basla: [], devam: [], tamam: [], tekrar: [] }
    for (const c of cards) map[c.status].push(c)
    for (const list of Object.values(map)) {
      list.sort((a, b) => a.subjectName.localeCompare(b.subjectName, "tr"))
    }
    return map
  }, [cards])

  const activeCard = activeId ? cards.find((c) => c.id === activeId) : null

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id))
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null)
    if (!e.over) return
    const cardId = String(e.active.id)
    const target = e.over.id
    if (!target || typeof target !== "string") return
    const nextStatus = target.startsWith("col:") ? (target.slice(4) as Status) : null
    if (!nextStatus) return

    const card = cards.find((c) => c.id === cardId)
    if (!card || card.status === nextStatus) return

    const previous = cards
    const optimistic = cards.map((c) =>
      c.id === cardId ? { ...c, status: nextStatus } : c,
    )
    setCards(optimistic)

    startTransition(async () => {
      const res = await updateTopicStatus(studentId, cardId, nextStatus)
      if (!res.success) {
        setCards(previous)
        toast.error(res.error ?? "Durum güncellenemedi.")
      }
    })
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeletePending(true)
    const res = await removeTopic(studentId, deleteTarget.id)
    setDeletePending(false)
    if (res.success) {
      toast.success("Konu kaldırıldı.")
      setCards((prev) => prev.filter((c) => c.id !== deleteTarget.id))
      setDeleteTarget(null)
    } else {
      toast.error(res.error ?? "Silinemedi.")
    }
  }

  if (cards.length === 0) {
    return (
      <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center">
        <h3 className="text-base font-semibold text-zinc-900 mb-1">
          Henüz konu atanmamış
        </h3>
        <p className="text-sm text-zinc-500">Sağ üstten konu ata.</p>
      </div>
    )
  }

  return (
    <>
      {/* Mobil: durum filtre + tek sütun */}
      <div className="md:hidden">
        <div className="-mx-1 px-1 overflow-x-auto pb-1 mb-3 scrollbar-hide">
          <div className="flex gap-1.5 min-w-min">
            {STATUS_LIST.map((s) => {
              const isActive = mobileStatus === s.value
              const count = byStatus[s.value].length
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setMobileStatus(s.value)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap",
                    isActive
                      ? "bg-[#1B6B8A] text-white border-[#1B6B8A]"
                      : "bg-white text-zinc-700 border-zinc-200",
                  )}
                  aria-pressed={isActive}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
                  {s.label}
                  <span
                    className={cn(
                      "tabular-nums",
                      isActive ? "text-white/80" : "text-zinc-400",
                    )}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <KanbanColumn
            status={mobileStatus}
            cards={byStatus[mobileStatus]}
            onDelete={(c) => setDeleteTarget(c)}
            mobile
          />
          <DragOverlay>
            {activeCard ? <CardPreview card={activeCard} /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Desktop: 4 sütun */}
      <div className="hidden md:block">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-4 gap-3">
            {STATUS_LIST.map((s) => (
              <KanbanColumn
                key={s.value}
                status={s.value}
                cards={byStatus[s.value]}
                onDelete={(c) => setDeleteTarget(c)}
              />
            ))}
          </div>
          <DragOverlay>
            {activeCard ? <CardPreview card={activeCard} /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      <p className="text-xs text-zinc-500 mt-3 hidden md:block">
        İpucu: kartı tutup başka sütuna sürükleyerek durumunu değiştirebilirsin.
      </p>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && !deletePending && setDeleteTarget(null)}
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
            <AlertDialogCancel disabled={deletePending}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deletePending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletePending ? "Siliniyor..." : "Evet, kaldır"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function KanbanColumn({
  status,
  cards,
  onDelete,
  mobile,
}: {
  status: Status
  cards: TopicCard[]
  onDelete: (c: TopicCard) => void
  mobile?: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${status}` })
  const meta = STATUS_LIST.find((s) => s.value === status)!
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "bg-zinc-50 border-2 rounded-2xl flex flex-col transition-colors",
        isOver ? `border-[#1B6B8A] bg-[#1B6B8A]/5` : "border-transparent",
        mobile ? "min-h-[300px]" : "min-h-[360px]",
      )}
    >
      <div
        className={cn(
          "px-3 py-2.5 rounded-t-2xl flex items-center justify-between",
          meta.tone,
        )}
      >
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
          <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
          {meta.label}
        </span>
        <Badge variant="outline" className="bg-white/60 text-xs tabular-nums">
          {cards.length}
        </Badge>
      </div>
      <div className="flex-1 p-2 space-y-2">
        {cards.length === 0 ? (
          <div className="h-full min-h-[120px] flex items-center justify-center">
            <p className="text-xs text-zinc-400 italic">Boş</p>
          </div>
        ) : (
          cards.map((c) => (
            <DraggableCard
              key={c.id}
              card={c}
              onDelete={() => onDelete(c)}
            />
          ))
        )}
      </div>
    </div>
  )
}

function DraggableCard({
  card,
  onDelete,
}: {
  card: TopicCard
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
  })

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group bg-white rounded-lg border border-zinc-200 px-3 py-2.5 cursor-grab active:cursor-grabbing",
        "hover:border-[#1B6B8A]/40 hover:shadow-sm transition-shadow",
        isDragging && "opacity-30",
      )}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-zinc-900 leading-snug break-words">
            {card.topicName}
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5 truncate">
            {card.subjectName}
          </div>
        </div>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50 transition-opacity shrink-0"
          aria-label="Konuyu kaldır"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {card.isCustom && (
        <Badge variant="outline" className="mt-1.5 text-[10px]">
          Özel
        </Badge>
      )}
    </div>
  )
}

function CardPreview({ card }: { card: TopicCard }) {
  return (
    <div className="bg-white rounded-lg border-2 border-[#1B6B8A] shadow-lg px-3 py-2.5 max-w-[260px]">
      <div className="text-sm font-medium text-zinc-900">{card.topicName}</div>
      <div className="text-[11px] text-zinc-500 mt-0.5">{card.subjectName}</div>
    </div>
  )
}
