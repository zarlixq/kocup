"use client"

import { useMemo, useOptimistic, useState, useTransition } from "react"
import { Plus, Pencil, Trash2, StickyNote, CheckCircle2, Clock, Target, GripVertical } from "lucide-react"
import { toast } from "sonner"
import { Checkbox } from "@/components/ui/checkbox"
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
import { DAYS, todayDayOfWeek } from "@/lib/days"
import {
  ProgramItemDialog,
  type ProgramItemInitial,
  type SubjectOption,
  type TopicOption,
} from "@/components/program/program-item-dialog"
import { WeekSwitcher } from "@/components/program/week-switcher"
import { OwnerBadge } from "@/components/shared/owner-badge"
import type { ProgramItemInput } from "@/lib/program/item-schema"
import {
  createProgramItem,
  deleteProgramItem,
  moveProgramItem,
  updateProgramItem,
} from "@/app/koc/ogrenciler/[id]/program/weekly-actions"
import {
  createMyProgramItem,
  deleteMyProgramItem,
  moveMyProgramItem,
  toggleProgramItemDone,
  updateMyProgramItem,
} from "@/app/ogrenci/program/actions"

export type ProgramItem = {
  id: string
  day_of_week: number
  start_time: string | null
  end_time: string | null
  subject_id: string | null
  topic_id: string | null
  topic_name: string | null
  baslik: string | null
  aciklama: string | null
  hedef_soru: number | null
  is_completed: boolean
  created_by_role: "student" | "coach" | "ai"
  subject: { id: string; name: string; color: string | null } | null
}

export type BoardMode = "coach" | "student" | "readonly"

type ActionResult = { success: boolean; error?: string }

const FALLBACK_PALETTE = [
  "#1B6B8A", "#F97316", "#3B82F6", "#10B981",
  "#A855F7", "#EC4899", "#06B6D4", "#F59E0B",
]

function colorFor(item: ProgramItem): string {
  if (item.subject?.color) return item.subject.color
  const seed = (item.baslik ?? item.subject?.name ?? "—")
    .split("")
    .reduce((s, c) => s + c.charCodeAt(0), 0)
  return FALLBACK_PALETTE[seed % FALLBACK_PALETTE.length]
}

function titleOf(item: ProgramItem): string {
  const main = item.topic_name ?? item.baslik
  if (item.subject?.name && main) return `${item.subject.name} · ${main}`
  return item.subject?.name ?? main ?? "—"
}

function timeRange(item: ProgramItem): string | null {
  if (!item.start_time) return null
  return item.end_time ? `${item.start_time}–${item.end_time}` : item.start_time
}

// Gün içi sıra: saatli kalemler saate göre önce, saatsizler eklenme sırasıyla sonra.
function sortItems(a: ProgramItem, b: ProgramItem) {
  if (a.start_time && b.start_time) return a.start_time.localeCompare(b.start_time)
  if (a.start_time) return -1
  if (b.start_time) return 1
  return 0
}

type Props = {
  weekStart: string
  items: ProgramItem[]
  mode: BoardMode
  baseHref: string
  /** Koç modunda zorunlu. */
  studentId?: string
  subjects?: SubjectOption[]
  topics?: TopicOption[]
}

type Patch = { id: string; is_completed?: boolean; day_of_week?: number }

export function WeeklyProgramBoard({
  weekStart,
  items,
  mode,
  baseHref,
  studentId,
  subjects = [],
  topics = [],
}: Props) {
  const canAdd = mode === "coach" || mode === "student"
  const canToggle = mode === "coach" || mode === "student"

  // Sahiplik kuralı (DB'de de zorlanır, migration 201):
  // öğrenci → kendi kalemini düzenler/siler; koç → kendi kalemini düzenler, her kalemi siler.
  const canEdit = (i: ProgramItem) =>
    mode === "student" ? i.created_by_role === "student" : mode === "coach" ? i.created_by_role !== "student" : false
  const canDelete = (i: ProgramItem) =>
    mode === "student" ? i.created_by_role === "student" : mode === "coach"
  // Rozet: koç/müdür görünümünde öğrenci kalemi, öğrenci görünümünde koç kalemi işaretlenir.
  const badgeFor = (i: ProgramItem): "student" | "coach" | "ai" | null => {
    if (i.created_by_role === "ai") return "ai"
    if (mode === "student") return i.created_by_role === "coach" ? "coach" : null
    return i.created_by_role === "student" ? "student" : null
  }

  const [optimisticItems, applyOptimistic] = useOptimistic(items, (state: ProgramItem[], patch: Patch) =>
    state.map((i) => (i.id === patch.id ? { ...i, ...patch } : i)),
  )

  const [, startTransition] = useTransition()
  const todayDay = todayDayOfWeek()
  const [selectedDay, setSelectedDay] = useState<number>(todayDay)

  const [createDay, setCreateDay] = useState<number | null>(null)
  const [editTarget, setEditTarget] = useState<ProgramItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProgramItem | null>(null)
  const [deletePending, setDeletePending] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropDay, setDropDay] = useState<number | null>(null)

  const byDay = useMemo(() => {
    const map = new Map<number, ProgramItem[]>()
    for (let d = 1; d <= 7; d++) map.set(d, [])
    for (const i of optimisticItems) map.get(i.day_of_week)?.push(i)
    for (const list of map.values()) list.sort(sortItems)
    return map
  }, [optimisticItems])

  const total = optimisticItems.length
  const done = optimisticItems.filter((i) => i.is_completed).length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  function submitItem(input: ProgramItemInput, itemId?: string): Promise<ActionResult> {
    if (mode === "coach" && studentId) {
      return itemId ? updateProgramItem(studentId, itemId, input) : createProgramItem(studentId, weekStart, input)
    }
    return itemId ? updateMyProgramItem(itemId, input) : createMyProgramItem(weekStart, input)
  }

  function handleToggle(item: ProgramItem, next: boolean) {
    startTransition(async () => {
      applyOptimistic({ id: item.id, is_completed: next })
      const res = await toggleProgramItemDone(item.id, next)
      if (!res.success) toast.error(res.error ?? "İşaretlenemedi.")
    })
  }

  function handleMove(item: ProgramItem, day: number) {
    if (item.day_of_week === day || !canEdit(item)) return
    startTransition(async () => {
      applyOptimistic({ id: item.id, day_of_week: day })
      const res =
        mode === "coach" && studentId
          ? await moveProgramItem(studentId, item.id, day)
          : await moveMyProgramItem(item.id, day)
      if (res.success) toast.success(`${DAYS.find((d) => d.num === day)?.label ?? ""} gününe taşındı.`)
      else toast.error(res.error ?? "Taşınamadı.")
    })
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeletePending(true)
    const res =
      mode === "coach" && studentId
        ? await deleteProgramItem(studentId, deleteTarget.id)
        : await deleteMyProgramItem(deleteTarget.id)
    setDeletePending(false)
    if (res.success) {
      toast.success("Kalem silindi.")
      setDeleteTarget(null)
    } else {
      toast.error(res.error ?? "Silinemedi.")
    }
  }

  const columnProps = (dayNum: number) => ({
    items: byDay.get(dayNum) ?? [],
    canAdd,
    canToggle,
    canEdit,
    canDelete,
    badgeFor,
    isToday: dayNum === todayDay,
    onAdd: () => setCreateDay(dayNum),
    onEdit: setEditTarget,
    onDelete: setDeleteTarget,
    onToggle: handleToggle,
  })

  const dndFor = (dayNum: number) => ({
    isDropTarget: dragId != null && dropDay === dayNum,
    onDragStart: (id: string) => setDragId(id),
    onDragEnd: () => {
      setDragId(null)
      setDropDay(null)
    },
    onDragOver: () => dragId && setDropDay(dayNum),
    onDrop: () => {
      const item = optimisticItems.find((i) => i.id === dragId)
      setDragId(null)
      setDropDay(null)
      if (item) handleMove(item, dayNum)
    },
  })

  const editInitial: ProgramItemInitial | undefined = editTarget
    ? {
        id: editTarget.id,
        day_of_week: editTarget.day_of_week,
        start_time: editTarget.start_time,
        end_time: editTarget.end_time,
        subject_id: editTarget.subject_id,
        topic_id: editTarget.topic_id,
        baslik: editTarget.baslik,
        aciklama: editTarget.aciklama,
        hedef_soru: editTarget.hedef_soru,
      }
    : undefined

  return (
    <div className="space-y-4">
      {/* Üst bar: hafta gezinme + tamamlanma özeti */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <WeekSwitcher baseHref={baseHref} weekStart={weekStart} />
        {total > 0 && (
          <div className="flex items-center gap-2">
            <div className="h-2 w-28 bg-zinc-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#10B981] transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-sm text-zinc-600 tabular-nums whitespace-nowrap">
              <CheckCircle2 className="inline h-3.5 w-3.5 text-[#10B981] mb-0.5 mr-1" />
              {done}/{total} (%{pct})
            </span>
          </div>
        )}
      </div>

      {/* Mobil: gün-chip seçici */}
      <div className="md:hidden -mx-1 px-1 overflow-x-auto pb-1 scrollbar-hide">
        <div className="flex gap-1.5 min-w-min">
          {DAYS.map((d) => {
            const list = byDay.get(d.num) ?? []
            const isActive = selectedDay === d.num
            const isToday = d.num === todayDay
            const dayDone = list.filter((i) => i.is_completed).length
            return (
              <button
                key={d.num}
                type="button"
                onClick={() => setSelectedDay(d.num)}
                className={cn(
                  "flex flex-col items-center justify-center min-w-[52px] py-2 px-2 rounded-xl text-xs font-medium border transition-colors",
                  isActive
                    ? "bg-[#1B6B8A] text-white border-[#1B6B8A]"
                    : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50",
                )}
                aria-pressed={isActive}
              >
                <span className={cn("leading-none", isToday && !isActive && "text-[#F97316]")}>{d.short}</span>
                <span
                  className={cn(
                    "mt-1 text-[10px] leading-none tabular-nums",
                    isActive ? "text-white/80" : "text-zinc-400",
                  )}
                >
                  {list.length > 0 ? `${dayDone}/${list.length}` : "0"}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Mobil: seçili gün (gün değiştirme düzenle dialog'undan; dokunmatik DnD yok) */}
      <div className="md:hidden">
        {(() => {
          const day = DAYS.find((d) => d.num === selectedDay)!
          return <DayColumn dayLabel={day.label} variant="mobile" {...columnProps(day.num)} />
        })()}
      </div>

      {/* Desktop: 7 sütun + sürükle-bırak */}
      <div className="hidden md:grid md:grid-cols-7 gap-3">
        {DAYS.map((d) => (
          <DayColumn
            key={d.num}
            dayLabel={d.label}
            dayShort={d.short}
            variant="desktop"
            {...columnProps(d.num)}
            dnd={canAdd ? dndFor(d.num) : undefined}
          />
        ))}
      </div>
      {canAdd && total > 0 && (
        <p className="hidden md:block text-xs text-zinc-400">
          İpucu: düzenleyebildiğin kalemleri sürükleyip başka güne bırakabilirsin.
        </p>
      )}

      {canAdd && createDay !== null && (
        <ProgramItemDialog
          subjects={subjects}
          topics={topics}
          initialDay={createDay}
          open
          onOpenChange={(o) => !o && setCreateDay(null)}
          onSubmit={submitItem}
        />
      )}

      {canAdd && editInitial && (
        <ProgramItemDialog
          key={editInitial.id}
          subjects={subjects}
          topics={topics}
          initial={editInitial}
          open
          onOpenChange={(o) => !o && setEditTarget(null)}
          onSubmit={submitItem}
        />
      )}

      {canAdd && (
        <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && !deletePending && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Kalemi sil?</AlertDialogTitle>
              <AlertDialogDescription>
                <span className="font-medium">{deleteTarget ? titleOf(deleteTarget) : "Bu kalem"}</span>{" "}
                programdan kalıcı olarak silinecek.
                {mode === "coach" && deleteTarget?.created_by_role === "student" && " Bu kalemi öğrenci eklemişti."}{" "}
                Bu işlem geri alınamaz.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletePending}>Vazgeç</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={deletePending} className="bg-red-600 hover:bg-red-700">
                {deletePending ? "Siliniyor..." : "Evet, sil"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}

type Dnd = {
  isDropTarget: boolean
  onDragStart: (id: string) => void
  onDragEnd: () => void
  onDragOver: () => void
  onDrop: () => void
}

type ColumnProps = {
  dayLabel: string
  dayShort?: string
  items: ProgramItem[]
  canAdd: boolean
  canToggle: boolean
  canEdit: (i: ProgramItem) => boolean
  canDelete: (i: ProgramItem) => boolean
  badgeFor: (i: ProgramItem) => "student" | "coach" | "ai" | null
  isToday: boolean
  onAdd: () => void
  onEdit: (i: ProgramItem) => void
  onDelete: (i: ProgramItem) => void
  onToggle: (i: ProgramItem, next: boolean) => void
  variant: "desktop" | "mobile"
  dnd?: Dnd
}

function DayColumn({
  dayLabel,
  dayShort,
  items,
  canAdd,
  canToggle,
  canEdit,
  canDelete,
  badgeFor,
  isToday,
  onAdd,
  onEdit,
  onDelete,
  onToggle,
  variant,
  dnd,
}: ColumnProps) {
  const isMobile = variant === "mobile"
  return (
    <div
      onDragOver={
        dnd
          ? (e) => {
              e.preventDefault()
              dnd.onDragOver()
            }
          : undefined
      }
      onDrop={
        dnd
          ? (e) => {
              e.preventDefault()
              dnd.onDrop()
            }
          : undefined
      }
      className={cn(
        "bg-white border rounded-2xl flex flex-col transition-colors",
        isToday ? "border-[#1B6B8A]/40 ring-1 ring-[#1B6B8A]/15" : "border-zinc-200",
        dnd?.isDropTarget && "border-[#F97316] bg-orange-50/40 ring-2 ring-[#F97316]/30",
        isMobile ? "min-h-[200px]" : "min-h-[260px]",
      )}
    >
      {!isMobile && (
        <div
          className={cn(
            "px-3 py-2.5 border-b flex items-center justify-between",
            isToday ? "border-[#1B6B8A]/20 bg-[#1B6B8A]/5" : "border-zinc-100",
          )}
        >
          <div className="min-w-0">
            <div className="text-xs font-semibold text-zinc-900 truncate">{dayShort}</div>
            <div className="text-[10px] text-zinc-500 truncate">{dayLabel}</div>
          </div>
          {items.length > 0 && <span className="text-[10px] tabular-nums text-zinc-400">{items.length}</span>}
        </div>
      )}

      <div className={cn("flex-1 p-2 space-y-1.5", isMobile && "pt-3")}>
        {items.length === 0 ? (
          <div className="h-full min-h-[120px] flex items-center justify-center">
            <p className="text-xs text-zinc-400 italic">Kalem yok</p>
          </div>
        ) : (
          items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              editable={canEdit(item)}
              deletable={canDelete(item)}
              canToggle={canToggle}
              badge={badgeFor(item)}
              onEdit={() => onEdit(item)}
              onDelete={() => onDelete(item)}
              onToggle={(next) => onToggle(item, next)}
              variant={variant}
              draggable={!!dnd && canEdit(item)}
              onDragStart={() => dnd?.onDragStart(item.id)}
              onDragEnd={() => dnd?.onDragEnd()}
            />
          ))
        )}
      </div>

      {canAdd && (
        <div className="p-2 pt-0">
          <button
            type="button"
            onClick={onAdd}
            className="w-full inline-flex items-center justify-center gap-1 rounded-lg border border-dashed text-xs font-medium py-2 border-zinc-200 text-zinc-500 hover:border-[#F97316] hover:text-[#F97316] hover:bg-orange-50/40 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Ekle
          </button>
        </div>
      )}
    </div>
  )
}

type CardProps = {
  item: ProgramItem
  editable: boolean
  deletable: boolean
  canToggle: boolean
  badge: "student" | "coach" | "ai" | null
  onEdit: () => void
  onDelete: () => void
  onToggle: (next: boolean) => void
  variant: "desktop" | "mobile"
  draggable: boolean
  onDragStart: () => void
  onDragEnd: () => void
}

function ItemCard({
  item,
  editable,
  deletable,
  canToggle,
  badge,
  onEdit,
  onDelete,
  onToggle,
  variant,
  draggable,
  onDragStart,
  onDragEnd,
}: CardProps) {
  const color = colorFor(item)
  const completed = item.is_completed
  const time = timeRange(item)
  const main = item.topic_name ?? item.baslik ?? item.subject?.name ?? "—"
  const secondary = item.topic_name && item.baslik ? item.baslik : null
  return (
    <div
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move"
        e.dataTransfer.setData("text/plain", item.id)
        onDragStart()
      }}
      onDragEnd={onDragEnd}
      className={cn(
        "group relative rounded-lg border transition-colors pl-2.5 pr-2 py-2",
        completed
          ? "bg-green-50/60 border-green-100"
          : "bg-zinc-50 hover:bg-white border-transparent hover:border-zinc-200",
        draggable && "cursor-grab active:cursor-grabbing",
        (editable || deletable) && variant === "mobile" && "pr-16",
      )}
    >
      <span aria-hidden className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-full" style={{ backgroundColor: color }} />

      <div className="pl-2 min-w-0 flex items-start gap-2">
        {canToggle && (
          <Checkbox
            checked={completed}
            onCheckedChange={(v) => onToggle(v === true)}
            className="mt-0.5 shrink-0"
            aria-label="Yapıldı olarak işaretle"
          />
        )}
        <div className="min-w-0 flex-1">
          {(time || item.subject?.name) && (
            <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-zinc-500 min-w-0">
              {time && (
                <span className="inline-flex items-center gap-0.5 normal-case tabular-nums text-zinc-600 shrink-0">
                  <Clock className="h-2.5 w-2.5" /> {time}
                </span>
              )}
              {time && item.subject?.name && <span className="text-zinc-300">·</span>}
              {item.subject?.name && <span className="truncate">{item.subject.name}</span>}
            </div>
          )}
          <div
            className={cn(
              "font-medium leading-snug",
              variant === "desktop" ? "text-xs" : "text-sm",
              completed ? "text-zinc-400 line-through" : "text-zinc-900",
            )}
          >
            {main}
          </div>
          {secondary && <div className="text-[11px] text-zinc-500 leading-snug">{secondary}</div>}
          {(item.hedef_soru || badge) && (
            <div className="mt-1 flex flex-wrap items-center gap-1">
              {item.hedef_soru && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-50 px-1.5 py-0.5 text-[10px] font-medium text-orange-700 tabular-nums">
                  <Target className="h-2.5 w-2.5" /> {item.hedef_soru} soru
                </span>
              )}
              {badge && <OwnerBadge role={badge} />}
            </div>
          )}
          {item.aciklama && (
            <div className="mt-1 flex items-start gap-1 text-[11px] text-zinc-500 leading-snug">
              <StickyNote className="h-3 w-3 mt-0.5 shrink-0" />
              <span className="line-clamp-2">{item.aciklama}</span>
            </div>
          )}
        </div>
        {draggable && variant === "desktop" && (
          <GripVertical className="h-3 w-3 shrink-0 text-zinc-300 opacity-0 group-hover:opacity-100" aria-hidden />
        )}
      </div>

      {(editable || deletable) && (
        <div
          className={cn(
            "absolute top-1.5 right-1.5 flex items-center gap-0.5 transition-opacity",
            // Dokunmatikte hover yok → mobilde her zaman görünür.
            variant === "mobile"
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100 focus-within:opacity-100",
          )}
        >
          {editable && (
            <button
              type="button"
              onClick={onEdit}
              className="p-1 rounded-md bg-white text-zinc-600 hover:text-[#1B6B8A] hover:bg-zinc-100"
              aria-label="Düzenle"
            >
              <Pencil className={variant === "mobile" ? "h-3.5 w-3.5" : "h-3 w-3"} />
            </button>
          )}
          {deletable && (
            <button
              type="button"
              onClick={onDelete}
              className="p-1 rounded-md bg-white text-zinc-600 hover:text-red-600 hover:bg-red-50"
              aria-label="Sil"
            >
              <Trash2 className={variant === "mobile" ? "h-3.5 w-3.5" : "h-3 w-3"} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
