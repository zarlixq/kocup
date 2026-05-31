"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Plus } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  createScheduleEntry,
  updateScheduleEntry,
} from "@/app/koc/ogrenciler/[id]/program/actions"

export type ScheduleEntry = {
  id?: string
  term: number
  day_of_week: number
  start_time: string
  end_time: string
  subject_id: string | null
  custom_title: string | null
  notes: string | null
}

export type SubjectOption = {
  id: string
  name: string
  exam_type: string | null
}

type Props = {
  studentId: string
  subjects: SubjectOption[]
  initial?: ScheduleEntry
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const DAYS = [
  { value: "1", label: "Pazartesi" },
  { value: "2", label: "Salı" },
  { value: "3", label: "Çarşamba" },
  { value: "4", label: "Perşembe" },
  { value: "5", label: "Cuma" },
  { value: "6", label: "Cumartesi" },
  { value: "7", label: "Pazar" },
]

const CUSTOM_VALUE = "__custom__"

function normalizeTime(t: string) {
  // "HH:MM:SS" → "HH:MM"
  return t.length >= 5 ? t.slice(0, 5) : t
}

export function ScheduleFormDialog({
  studentId,
  subjects,
  initial,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: Props) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const open = controlledOpen ?? uncontrolledOpen
  const setOpen = onOpenChange ?? setUncontrolledOpen

  const [pending, startTransition] = useTransition()

  const [term, setTerm] = useState(initial?.term?.toString() ?? "1")
  const [day, setDay] = useState(initial?.day_of_week?.toString() ?? "1")
  const [startTime, setStartTime] = useState(
    initial ? normalizeTime(initial.start_time) : "16:00",
  )
  const [endTime, setEndTime] = useState(
    initial ? normalizeTime(initial.end_time) : "17:00",
  )
  const [subjectMode, setSubjectMode] = useState<string>(
    initial?.subject_id ?? (initial?.custom_title ? CUSTOM_VALUE : ""),
  )
  const [customTitle, setCustomTitle] = useState(initial?.custom_title ?? "")
  const [notes, setNotes] = useState(initial?.notes ?? "")
  const [error, setError] = useState<string | null>(null)

  const isEdit = Boolean(initial?.id)

  function reset() {
    setError(null)
    if (!initial) {
      setTerm("1")
      setDay("1")
      setStartTime("16:00")
      setEndTime("17:00")
      setSubjectMode("")
      setCustomTitle("")
      setNotes("")
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const subjectId = subjectMode === CUSTOM_VALUE || subjectMode === "" ? null : subjectMode
    const finalCustomTitle = subjectMode === CUSTOM_VALUE ? customTitle.trim() : null

    if (!subjectId && !finalCustomTitle) {
      setError("Ders seç veya özel başlık gir.")
      return
    }
    if (endTime <= startTime) {
      setError("Bitiş saati başlangıçtan sonra olmalı.")
      return
    }

    const payload = {
      term: Number(term),
      day_of_week: Number(day),
      start_time: startTime,
      end_time: endTime,
      subject_id: subjectId,
      custom_title: finalCustomTitle,
      notes: notes.trim() || null,
    }

    startTransition(async () => {
      const res = isEdit && initial?.id
        ? await updateScheduleEntry(studentId, initial.id, payload)
        : await createScheduleEntry(studentId, payload)

      if (res.success) {
        toast.success(isEdit ? "Ders güncellendi." : "Ders eklendi.")
        reset()
        setOpen(false)
      } else {
        setError(res.error ?? "İşlem başarısız.")
        toast.error(res.error ?? "İşlem başarısız.")
      }
    })
  }

  const groupedSubjects = subjects.reduce<Record<string, SubjectOption[]>>(
    (acc, s) => {
      const key = (s.exam_type ?? "diger").toUpperCase()
      ;(acc[key] ||= []).push(s)
      return acc
    },
    {},
  )

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (pending) return
        setOpen(o)
        if (!o) reset()
      }}
    >
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Dersi Düzenle" : "Yeni Ders"}</DialogTitle>
          <DialogDescription>
            Öğrencinin haftalık programına ders ekle veya düzenle.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="term">Dönem</Label>
              <Select value={term} onValueChange={setTerm}>
                <SelectTrigger id="term">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1. Dönem</SelectItem>
                  <SelectItem value="2">2. Dönem</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="day">Gün</Label>
              <Select value={day} onValueChange={setDay}>
                <SelectTrigger id="day">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="start_time">Başlangıç</Label>
              <Input
                id="start_time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end_time">Bitiş</Label>
              <Input
                id="end_time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="subject">Ders</Label>
            <Select value={subjectMode} onValueChange={setSubjectMode}>
              <SelectTrigger id="subject">
                <SelectValue placeholder="Ders seç" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {Object.entries(groupedSubjects).map(([group, items]) => (
                  <SelectGroup key={group}>
                    <SelectLabel>{group}</SelectLabel>
                    {items.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
                <SelectGroup>
                  <SelectLabel>Diğer</SelectLabel>
                  <SelectItem value={CUSTOM_VALUE}>Özel başlık gir…</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            {subjectMode === CUSTOM_VALUE && (
              <Input
                placeholder="ör. Etüt, Soru Çözümü, Genel Tekrar"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                required
                maxLength={120}
                className="mt-2"
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Not (opsiyonel)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              placeholder="Kısa açıklama"
              rows={2}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Vazgeç
            </Button>
            <Button
              type="submit"
              variant="accent"
              disabled={pending}
            >
              {pending ? "Kaydediliyor..." : isEdit ? "Güncelle" : (
                <>
                  <Plus className="h-4 w-4" /> Ekle
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
