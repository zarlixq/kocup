"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { AlertTriangle, Calendar as CalendarIcon, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  APPOINTMENT_TYPE_LABEL,
  RECURRENCE_LABEL,
  type AppointmentType,
} from "@/lib/appointments/constants"
import {
  createAppointment,
  updateAppointment,
  type CreateAppointmentInput,
} from "@/app/koc/randevular/actions"

type Student = { id: string; full_name: string }

type FormMode =
  | { mode: "create"; initial?: never; isPartOfSeries?: never }
  | {
      mode: "edit"
      initial: {
        id: string
        title: string
        type: AppointmentType
        start_time: string
        end_time: string
        meeting_link: string | null
        notes: string | null
        student_id: string | null
      }
      isPartOfSeries: boolean
    }

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  students: Student[]
  defaultStudentId?: string | null
  defaultStart?: Date
} & FormMode

const DURATIONS = [15, 30, 45, 60, 90]

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function diffMinutes(start: string, end: string) {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000)
}

function addMinutes(iso: string, mins: number) {
  return new Date(new Date(iso).getTime() + mins * 60000)
}

export function AppointmentFormDialog(props: Props) {
  const { open, onOpenChange, students, defaultStudentId, defaultStart, mode } = props

  const isEdit = mode === "edit"
  const initial = isEdit ? props.initial : undefined

  const defaultStartIso = initial
    ? toLocalInputValue(new Date(initial.start_time))
    : defaultStart
      ? toLocalInputValue(defaultStart)
      : toLocalInputValue(new Date(Date.now() + 60 * 60 * 1000))

  const defaultDuration = initial
    ? diffMinutes(initial.start_time, initial.end_time)
    : 30

  const [title, setTitle] = useState(initial?.title ?? "")
  const [type, setType] = useState<AppointmentType>(initial?.type ?? "koc_gorusme")
  const [studentId, setStudentId] = useState<string>(
    initial?.student_id ?? defaultStudentId ?? "",
  )
  const [startTime, setStartTime] = useState<string>(defaultStartIso)
  const [duration, setDuration] = useState<number>(defaultDuration)
  const [meetingLink, setMeetingLink] = useState(initial?.meeting_link ?? "")
  const [notes, setNotes] = useState(initial?.notes ?? "")
  const [recurrence, setRecurrence] = useState<"none" | "weekly" | "biweekly">("none")
  const [recurrenceEnd, setRecurrenceEnd] = useState<string>(() => {
    const d = new Date()
    d.setMonth(d.getMonth() + 2)
    return d.toISOString().slice(0, 10)
  })
  const [scope, setScope] = useState<"one" | "series">("one")

  const [pending, startTransition] = useTransition()
  const [conflict, setConflict] = useState<{
    title: string
    start_time: string
    end_time: string
  } | null>(null)

  const handleClose = () => {
    if (!pending) onOpenChange(false)
  }

  function buildPayload(force: boolean): CreateAppointmentInput {
    const startDate = new Date(startTime)
    const endDate = addMinutes(startTime, duration)

    return {
      title: title.trim() || studentNameForTitle(studentId, students, type),
      type,
      student_id: studentId || null,
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      meeting_link: meetingLink.trim() || "",
      notes: notes.trim() || undefined,
      is_recurring: !isEdit && recurrence !== "none",
      recurrence_rule: !isEdit && recurrence !== "none" ? recurrence : null,
      recurrence_end_date: !isEdit && recurrence !== "none" ? recurrenceEnd : null,
      force,
    }
  }

  function handleSubmit(force = false) {
    if (!title.trim() && !studentId) {
      toast.error("Başlık veya öğrenci seçmelisiniz")
      return
    }

    startTransition(async () => {
      if (isEdit && initial) {
        const startDate = new Date(startTime)
        const endDate = addMinutes(startTime, duration)
        const res = await updateAppointment({
          id: initial.id,
          title: title.trim() || undefined,
          type,
          start_time: startDate.toISOString(),
          end_time: endDate.toISOString(),
          meeting_link: meetingLink.trim() || "",
          notes: notes.trim() || undefined,
          scope,
          force,
        })
        if (res.conflict) {
          setConflict(res.conflict)
          return
        }
        if (!res.success) {
          toast.error(res.error ?? "Güncellenemedi")
          return
        }
        toast.success("✏️ Randevu güncellendi")
        onOpenChange(false)
      } else {
        const res = await createAppointment(buildPayload(force))
        if (res.conflict) {
          setConflict(res.conflict)
          return
        }
        if (!res.success) {
          toast.error(res.error ?? "Oluşturulamadı")
          return
        }
        toast.success("✅ Randevu oluşturuldu")
        onOpenChange(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-[#1B6B8A]" />
            {isEdit ? "Randevuyu Düzenle" : "Yeni Randevu"}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? "Bilgileri güncelleyin." : "Öğrenci ile yeni bir görüşme planlayın."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tip */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tip</Label>
              <Select value={type} onValueChange={(v) => setType(v as AppointmentType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="koc_gorusme">{APPOINTMENT_TYPE_LABEL.koc_gorusme}</SelectItem>
                  <SelectItem value="veli_gorusme">{APPOINTMENT_TYPE_LABEL.veli_gorusme}</SelectItem>
                  <SelectItem value="ozel">{APPOINTMENT_TYPE_LABEL.ozel}</SelectItem>
                  <SelectItem value="tanitim">{APPOINTMENT_TYPE_LABEL.tanitim}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Öğrenci</Label>
              <Select
                value={studentId || "none"}
                onValueChange={(v) => setStudentId(v === "none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seç" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Öğrenci yok —</SelectItem>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Başlık */}
          <div className="space-y-1.5">
            <Label htmlFor="title">Başlık</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Örn: Haftalık görüşme"
            />
          </div>

          {/* Tarih + Saat */}
          <div className="space-y-1.5">
            <Label htmlFor="start">Tarih ve Saat</Label>
            <Input
              id="start"
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>

          {/* Süre */}
          <div className="space-y-1.5">
            <Label>Süre</Label>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    duration === d
                      ? "bg-[#1B6B8A] text-white border-[#1B6B8A]"
                      : "bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300"
                  }`}
                >
                  {d} dk
                </button>
              ))}
              <Input
                type="number"
                min={5}
                max={480}
                value={duration}
                onChange={(e) => setDuration(Math.max(5, Number(e.target.value) || 30))}
                className="w-20 h-8"
              />
            </div>
          </div>

          {/* Tekrarlama — yalnız create modda */}
          {!isEdit && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tekrarlama</Label>
                <Select
                  value={recurrence}
                  onValueChange={(v) => setRecurrence(v as "none" | "weekly" | "biweekly")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tek sefer</SelectItem>
                    <SelectItem value="weekly">{RECURRENCE_LABEL.weekly}</SelectItem>
                    <SelectItem value="biweekly">{RECURRENCE_LABEL.biweekly}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {recurrence !== "none" && (
                <div className="space-y-1.5">
                  <Label htmlFor="rend">Bitiş Tarihi</Label>
                  <Input
                    id="rend"
                    type="date"
                    value={recurrenceEnd}
                    onChange={(e) => setRecurrenceEnd(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          {/* Edit + part of series → scope seçici */}
          {isEdit && props.isPartOfSeries && (
            <div className="space-y-1.5">
              <Label>Güncelleme Kapsamı</Label>
              <Select value={scope} onValueChange={(v) => setScope(v as "one" | "series")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one">Sadece bu randevu</SelectItem>
                  <SelectItem value="series">Tüm seri</SelectItem>
                </SelectContent>
              </Select>
              {scope === "series" && (
                <p className="text-xs text-zinc-500">
                  Seri güncellemede tarih/saat değişmez; sadece içerik (başlık, tip, link, not) uygulanır.
                </p>
              )}
            </div>
          )}

          {/* Meet link */}
          <div className="space-y-1.5">
            <Label htmlFor="link">Toplantı Linki (opsiyonel)</Label>
            <Input
              id="link"
              type="url"
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
              placeholder="https://meet.google.com/..."
            />
          </div>

          {/* Not */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Not (opsiyonel)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Görüşme öncesi hatırlatmalar..."
              rows={3}
            />
          </div>

          {/* Çakışma uyarısı */}
          {conflict && (
            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="font-medium text-amber-900">Çakışan randevu var</div>
                <div className="text-amber-800 mt-1">
                  &quot;{conflict.title}&quot; — {formatRange(conflict.start_time, conflict.end_time)}
                </div>
                <div className="mt-2 text-amber-700">Yine de oluşturmak istiyor musunuz?</div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {conflict ? (
            <>
              <Button variant="outline" onClick={handleClose} disabled={pending}>
                Vazgeç
              </Button>
              <Button
                variant="accent"
                onClick={() => {
                  setConflict(null)
                  handleSubmit(true)
                }}
                disabled={pending}
              >
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                Yine de Oluştur
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} disabled={pending}>
                Vazgeç
              </Button>
              <Button variant="accent" onClick={() => handleSubmit(false)} disabled={pending}>
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEdit ? "Kaydet" : "Oluştur"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function studentNameForTitle(
  studentId: string,
  students: Student[],
  type: AppointmentType,
) {
  const s = students.find((x) => x.id === studentId)
  if (s) return `${s.full_name} ile görüşme`
  return APPOINTMENT_TYPE_LABEL[type]
}

function formatRange(startIso: string, endIso: string) {
  const s = new Date(startIso)
  const e = new Date(endIso)
  const fmt = (d: Date) =>
    d.toLocaleString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  return `${fmt(s)} → ${e.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`
}
