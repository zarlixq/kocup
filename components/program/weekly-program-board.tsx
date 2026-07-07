"use client"

import { useMemo, useOptimistic, useState, useTransition } from "react"
import { Plus, Pencil, Trash2, StickyNote, CheckCircle2 } from "lucide-react"
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
  type SubjectOption,
} from "@/components/program/program-item-dialog"
import { WeekSwitcher } from "@/components/program/week-switcher"
import { deleteProgramItem } from "@/app/koc/ogrenciler/[id]/program/weekly-actions"
import { toggleProgramItemDone } from "@/app/ogrenci/program/actions"

export type ProgramItem = {
  id: string
  day_of_week: number
  subject_id: string | null
  baslik: string | null
  aciklama: string | null
  is_completed: boolean
  subject: { id: string; name: string; color: string | null } | null
}

export type BoardMode = "coach" | "student" | "readonly"

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
  if (item.subject?.name && item.baslik) return `${item.subject.name} · ${item.baslik}`
  return item.subject?.name ?? item.baslik ?? "—"
}

type Props = {
  weekStart: string
  items: ProgramItem[]
  mode: BoardMode
  baseHref: string
  studentId?: string
  subjects?: SubjectOption[]
  /** Üst barda WeekSwitcher yanında ekstra içerik (ör. carry-forward butonu). */
}

export function WeeklyProgramBoard({
  weekStart,
  items,
  mode,
  baseHref,
  studentId,
  subjects = [],
}: Props) {
  const editable = mode === "coach"
  const canToggle = mode === "coach" || mode === "student"

  const [optimisticItems, applyOptimistic] = useOptimistic(
    items,
    (state: ProgramItem[], patch: { id: string; is_completed: boolean }) =>
      state.map((i) => (i.id === patch.id ? { ...i, is_completed: patch.is_completed } : i)),
  )

  const [, startTransition] = useTransition()
  const todayDay = todayDayOfWeek()
  const [selectedDay, setSelectedDay] = useState<number>(todayDay)

  const [createDay, setCreateDay] = useState<number | null>(null)
  const [editTarget, setEditTarget] = useState<ProgramItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProgramItem | null>(null)
  const [deletePending, setDeletePending] = useState(false)

  const byDay = useMemo(() => {
    const map = new Map<number, ProgramItem[]>()
    for (let d = 1; d <= 7; d++) map.set(d, [])
    for (const i of optimisticItems) map.get(i.day_of_week)?.push(i)
    return map
  }, [optimisticItems])

  const total = optimisticItems.length
  const done = optimisticItems.filter((i) => i.is_completed).length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  function handleToggle(item: ProgramItem, next: boolean) {
    startTransition(async () => {
      applyOptimistic({ id: item.id, is_completed: next })
      const res = await toggleProgramItemDone(item.id, next)
      if (!res.success) toast.error(res.error ?? "İşaretlenemedi.")
    })
  }

  async function handleDelete() {
    if (!deleteTarget || !studentId) return
    setDeletePending(true)
    const res = await deleteProgramItem(studentId, deleteTarget.id)
    setDeletePending(false)
    if (res.success) {
      toast.success("Kalem silindi.")
      setDeleteTarget(null)
    } else {
      toast.error(res.error ?? "Silinemedi.")
    }
  }

  return (
    <div className="space-y-4">
      {/* Üst bar: hafta gezinme + tamamlanma özeti */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <WeekSwitcher baseHref={baseHref} weekStart={weekStart} />
        {total > 0 && (
          <div className="flex items-center gap-2">
            <div className="h-2 w-28 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#10B981] transition-all"
                style={{ width: `${pct}%` }}
              />
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
                <span className={cn("leading-none", isToday && !isActive && "text-[#F97316]")}>
                  {d.short}
                </span>
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

      {/* Mobil: seçili gün */}
      <div className="md:hidden">
        {(() => {
          const day = DAYS.find((d) => d.num === selectedDay)!
          return (
            <DayColumn
              dayLabel={day.label}
              items={byDay.get(day.num) ?? []}
              editable={editable}
              canToggle={canToggle}
              isToday={day.num === todayDay}
              onAdd={() => setCreateDay(day.num)}
              onEdit={setEditTarget}
              onDelete={setDeleteTarget}
              onToggle={handleToggle}
              variant="mobile"
            />
          )
        })()}
      </div>

      {/* Desktop: 7 sütun */}
      <div className="hidden md:grid md:grid-cols-7 gap-3">
        {DAYS.map((d) => (
          <DayColumn
            key={d.num}
            dayLabel={d.label}
            dayShort={d.short}
            items={byDay.get(d.num) ?? []}
            editable={editable}
            canToggle={canToggle}
            isToday={d.num === todayDay}
            onAdd={() => setCreateDay(d.num)}
            onEdit={setEditTarget}
            onDelete={setDeleteTarget}
            onToggle={handleToggle}
            variant="desktop"
          />
        ))}
      </div>

      {/* Create/Edit dialog (koç) */}
      {editable && studentId && createDay !== null && (
        <ProgramItemDialog
          studentId={studentId}
          weekStart={weekStart}
          subjects={subjects}
          initialDay={createDay}
          open={createDay !== null}
          onOpenChange={(o) => !o && setCreateDay(null)}
        />
      )}

      {editable && studentId && editTarget && (
        <ProgramItemDialog
          studentId={studentId}
          weekStart={weekStart}
          subjects={subjects}
          initial={{
            id: editTarget.id,
            day_of_week: editTarget.day_of_week,
            subject_id: editTarget.subject_id,
            baslik: editTarget.baslik,
            aciklama: editTarget.aciklama,
          }}
          open={!!editTarget}
          onOpenChange={(o) => !o && setEditTarget(null)}
        />
      )}

      {/* Delete confirm (koç) */}
      {editable && (
        <AlertDialog
          open={!!deleteTarget}
          onOpenChange={(o) => !o && !deletePending && setDeleteTarget(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Kalemi sil?</AlertDialogTitle>
              <AlertDialogDescription>
                <span className="font-medium">
                  {deleteTarget ? titleOf(deleteTarget) : "Bu kalem"}
                </span>{" "}
                programdan kalıcı olarak silinecek. Bu işlem geri alınamaz.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletePending}>Vazgeç</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deletePending}
                className="bg-red-600 hover:bg-red-700"
              >
                {deletePending ? "Siliniyor..." : "Evet, sil"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}

type ColumnProps = {
  dayLabel: string
  dayShort?: string
  items: ProgramItem[]
  editable: boolean
  canToggle: boolean
  isToday: boolean
  onAdd: () => void
  onEdit: (i: ProgramItem) => void
  onDelete: (i: ProgramItem) => void
  onToggle: (i: ProgramItem, next: boolean) => void
  variant: "desktop" | "mobile"
}

function DayColumn({
  dayLabel,
  dayShort,
  items,
  editable,
  canToggle,
  isToday,
  onAdd,
  onEdit,
  onDelete,
  onToggle,
  variant,
}: ColumnProps) {
  const isMobile = variant === "mobile"
  return (
    <div
      className={cn(
        "bg-white border rounded-2xl flex flex-col",
        isToday ? "border-[#1B6B8A]/40 ring-1 ring-[#1B6B8A]/15" : "border-zinc-200",
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
          {items.length > 0 && (
            <span className="text-[10px] tabular-nums text-zinc-400">{items.length}</span>
          )}
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
              editable={editable}
              canToggle={canToggle}
              onEdit={() => onEdit(item)}
              onDelete={() => onDelete(item)}
              onToggle={(next) => onToggle(item, next)}
              variant={variant}
            />
          ))
        )}
      </div>

      {editable && (
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
  canToggle: boolean
  onEdit: () => void
  onDelete: () => void
  onToggle: (next: boolean) => void
  variant: "desktop" | "mobile"
}

function ItemCard({ item, editable, canToggle, onEdit, onDelete, onToggle, variant }: CardProps) {
  const color = colorFor(item)
  const completed = item.is_completed
  return (
    <div
      className={cn(
        "group relative rounded-lg border transition-colors pl-2.5 pr-2 py-2",
        completed
          ? "bg-green-50/60 border-green-100"
          : "bg-zinc-50 hover:bg-white border-transparent hover:border-zinc-200",
      )}
    >
      <span
        aria-hidden
        className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-full"
        style={{ backgroundColor: color }}
      />

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
          {item.subject?.name && (
            <div className="text-[10px] uppercase tracking-wide text-zinc-500 truncate">
              {item.subject.name}
            </div>
          )}
          <div
            className={cn(
              "font-medium leading-snug",
              variant === "desktop" ? "text-xs" : "text-sm",
              completed ? "text-zinc-400 line-through" : "text-zinc-900",
            )}
          >
            {item.baslik ?? item.subject?.name ?? "—"}
          </div>
          {item.aciklama && (
            <div className="mt-1 flex items-start gap-1 text-[11px] text-zinc-500 leading-snug">
              <StickyNote className="h-3 w-3 mt-0.5 shrink-0" />
              <span className="line-clamp-2">{item.aciklama}</span>
            </div>
          )}
        </div>
      </div>

      {editable && (
        <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={onEdit}
            className="p-1 rounded-md bg-white text-zinc-600 hover:text-[#1B6B8A] hover:bg-zinc-100"
            aria-label="Düzenle"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1 rounded-md bg-white text-zinc-600 hover:text-red-600 hover:bg-red-50"
            aria-label="Sil"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  )
}
