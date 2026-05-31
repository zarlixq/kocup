"use client"

import { useMemo, useState } from "react"
import { Plus, Pencil, Trash2, StickyNote } from "lucide-react"
import { toast } from "sonner"
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
  ScheduleFormDialog,
  type SubjectOption,
} from "@/components/koc/schedule-form-dialog"
import { deleteScheduleEntry } from "@/app/koc/ogrenciler/[id]/program/actions"

export type ScheduleEntryWithSubject = {
  id: string
  term: number
  day_of_week: number
  start_time: string
  end_time: string
  subject_id: string | null
  custom_title: string | null
  notes: string | null
  subject?: { id: string; name: string; color: string | null } | null
}

const DAYS = [
  { num: 1, short: "Pzt", label: "Pazartesi" },
  { num: 2, short: "Sal", label: "Salı" },
  { num: 3, short: "Çar", label: "Çarşamba" },
  { num: 4, short: "Per", label: "Perşembe" },
  { num: 5, short: "Cum", label: "Cuma" },
  { num: 6, short: "Cts", label: "Cumartesi" },
  { num: 7, short: "Paz", label: "Pazar" },
]

const FALLBACK_PALETTE = [
  "#1B6B8A",
  "#F97316",
  "#3B82F6",
  "#10B981",
  "#A855F7",
  "#EC4899",
  "#06B6D4",
  "#F59E0B",
]

function colorFor(entry: ScheduleEntryWithSubject): string {
  if (entry.subject?.color) return entry.subject.color
  const seed = (entry.custom_title ?? entry.subject?.name ?? "—")
    .split("")
    .reduce((s, c) => s + c.charCodeAt(0), 0)
  return FALLBACK_PALETTE[seed % FALLBACK_PALETTE.length]
}

function normalizeTime(t: string) {
  return t.length >= 5 ? t.slice(0, 5) : t
}

type Props = {
  entries: ScheduleEntryWithSubject[]
  subjects: SubjectOption[]
  /** Editable: koç tarafı; readonly: öğrenci/müdür. */
  editable: boolean
  /** Editable=true ise gerekli. */
  studentId?: string
  /** Aktif dönem (1/2). */
  term: number
}

export function WeeklyScheduleGrid({
  entries,
  subjects,
  editable,
  studentId,
  term,
}: Props) {
  const todayDay = ((new Date().getDay() + 6) % 7) + 1 // Pzt=1..Paz=7
  const [selectedDay, setSelectedDay] = useState<number>(todayDay)
  const [createOpen, setCreateOpen] = useState(false)
  const [createDefaults, setCreateDefaults] = useState<{
    day_of_week: number
    start_time?: string
  }>({ day_of_week: todayDay })
  const [editTarget, setEditTarget] = useState<ScheduleEntryWithSubject | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ScheduleEntryWithSubject | null>(null)
  const [deletePending, setDeletePending] = useState(false)

  const byDay = useMemo(() => {
    const map = new Map<number, ScheduleEntryWithSubject[]>()
    for (let d = 1; d <= 7; d++) map.set(d, [])
    for (const e of entries) {
      map.get(e.day_of_week)?.push(e)
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.start_time.localeCompare(b.start_time))
    }
    return map
  }, [entries])

  function openCreateFor(day: number) {
    setCreateDefaults({ day_of_week: day })
    setCreateOpen(true)
  }

  async function handleDelete() {
    if (!deleteTarget || !studentId) return
    setDeletePending(true)
    const res = await deleteScheduleEntry(studentId, deleteTarget.id)
    setDeletePending(false)
    if (res.success) {
      toast.success("Ders silindi.")
      setDeleteTarget(null)
    } else {
      toast.error(res.error ?? "Silinemedi.")
    }
  }

  return (
    <>
      {/* Mobil: gün-chip seçici */}
      <div className="md:hidden -mx-1 px-1 overflow-x-auto pb-1 mb-3 scrollbar-hide">
        <div className="flex gap-1.5 min-w-min">
          {DAYS.map((d) => {
            const count = byDay.get(d.num)?.length ?? 0
            const isActive = selectedDay === d.num
            const isToday = d.num === todayDay
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
                <span
                  className={cn(
                    "leading-none",
                    isToday && !isActive && "text-[#F97316]",
                  )}
                >
                  {d.short}
                </span>
                <span
                  className={cn(
                    "mt-1 text-[10px] leading-none tabular-nums",
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

      {/* Mobil: seçili günün kartları */}
      <div className="md:hidden space-y-2">
        {(() => {
          const day = DAYS.find((d) => d.num === selectedDay)!
          const list = byDay.get(day.num) ?? []
          return (
            <DayColumn
              dayLabel={day.label}
              entries={list}
              editable={editable}
              isToday={day.num === todayDay}
              onAdd={() => openCreateFor(day.num)}
              onEdit={(e) => setEditTarget(e)}
              onDelete={(e) => setDeleteTarget(e)}
              variant="mobile"
            />
          )
        })()}
      </div>

      {/* Desktop: 7 sütun grid */}
      <div className="hidden md:grid md:grid-cols-7 gap-3">
        {DAYS.map((d) => {
          const list = byDay.get(d.num) ?? []
          return (
            <DayColumn
              key={d.num}
              dayLabel={d.label}
              dayShort={d.short}
              entries={list}
              editable={editable}
              isToday={d.num === todayDay}
              onAdd={() => openCreateFor(d.num)}
              onEdit={(e) => setEditTarget(e)}
              onDelete={(e) => setDeleteTarget(e)}
              variant="desktop"
            />
          )
        })}
      </div>

      {/* Create dialog (sadece editable) */}
      {editable && studentId && (
        <ScheduleFormDialog
          studentId={studentId}
          subjects={subjects}
          open={createOpen}
          onOpenChange={setCreateOpen}
          initialDefaults={{ term, day_of_week: createDefaults.day_of_week }}
        />
      )}

      {/* Edit dialog */}
      {editable && studentId && editTarget && (
        <ScheduleFormDialog
          studentId={studentId}
          subjects={subjects}
          open={!!editTarget}
          onOpenChange={(o) => !o && setEditTarget(null)}
          initial={{
            id: editTarget.id,
            term: editTarget.term,
            day_of_week: editTarget.day_of_week,
            start_time: editTarget.start_time,
            end_time: editTarget.end_time,
            subject_id: editTarget.subject_id,
            custom_title: editTarget.custom_title,
            notes: editTarget.notes,
          }}
        />
      )}

      {/* Delete confirm */}
      {editable && (
        <AlertDialog
          open={!!deleteTarget}
          onOpenChange={(o) => !o && !deletePending && setDeleteTarget(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Dersi sil?</AlertDialogTitle>
              <AlertDialogDescription>
                <span className="font-medium">
                  {deleteTarget?.subject?.name ?? deleteTarget?.custom_title ?? "Bu ders"}
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
    </>
  )
}

type ColumnProps = {
  dayLabel: string
  dayShort?: string
  entries: ScheduleEntryWithSubject[]
  editable: boolean
  isToday: boolean
  onAdd: () => void
  onEdit: (e: ScheduleEntryWithSubject) => void
  onDelete: (e: ScheduleEntryWithSubject) => void
  variant: "desktop" | "mobile"
}

function DayColumn({
  dayLabel,
  dayShort,
  entries,
  editable,
  isToday,
  onAdd,
  onEdit,
  onDelete,
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
          {entries.length > 0 && (
            <span className="text-[10px] tabular-nums text-zinc-400">
              {entries.length}
            </span>
          )}
        </div>
      )}

      <div className={cn("flex-1 p-2 space-y-1.5", isMobile && "pt-3")}>
        {entries.length === 0 ? (
          <div className="h-full min-h-[120px] flex items-center justify-center">
            <p className="text-xs text-zinc-400 italic">Ders yok</p>
          </div>
        ) : (
          entries.map((e) => (
            <LessonCard
              key={e.id}
              entry={e}
              editable={editable}
              onEdit={() => onEdit(e)}
              onDelete={() => onDelete(e)}
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
            className={cn(
              "w-full inline-flex items-center justify-center gap-1 rounded-lg border border-dashed text-xs font-medium py-2",
              "border-zinc-200 text-zinc-500 hover:border-[#F97316] hover:text-[#F97316] hover:bg-orange-50/40 transition-colors",
            )}
          >
            <Plus className="h-3.5 w-3.5" />
            Ders Ekle
          </button>
        </div>
      )}
    </div>
  )
}

type CardProps = {
  entry: ScheduleEntryWithSubject
  editable: boolean
  onEdit: () => void
  onDelete: () => void
  variant: "desktop" | "mobile"
}

function LessonCard({ entry, editable, onEdit, onDelete, variant }: CardProps) {
  const color = colorFor(entry)
  const title = entry.subject?.name ?? entry.custom_title ?? "—"
  return (
    <div
      className={cn(
        "group relative rounded-lg bg-zinc-50 hover:bg-white border border-transparent hover:border-zinc-200 transition-colors",
        "pl-2.5 pr-2 py-2",
      )}
    >
      {/* Renk şeridi */}
      <span
        aria-hidden
        className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-full"
        style={{ backgroundColor: color }}
      />

      <div className="pl-2 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[11px] font-semibold tabular-nums text-zinc-700">
            {normalizeTime(entry.start_time)}
            <span className="text-zinc-400 mx-0.5">–</span>
            {normalizeTime(entry.end_time)}
          </span>
        </div>
        <div
          className={cn(
            "mt-0.5 font-medium text-zinc-900 leading-snug truncate",
            variant === "desktop" ? "text-xs" : "text-sm",
          )}
        >
          {title}
        </div>
        {entry.notes && (
          <div className="mt-1 flex items-start gap-1 text-[11px] text-zinc-500 leading-snug">
            <StickyNote className="h-3 w-3 mt-0.5 shrink-0" />
            <span className="line-clamp-2">{entry.notes}</span>
          </div>
        )}
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
