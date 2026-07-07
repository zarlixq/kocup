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
import { DAYS } from "@/lib/days"
import {
  createProgramItem,
  updateProgramItem,
} from "@/app/koc/ogrenciler/[id]/program/weekly-actions"

export type SubjectOption = {
  id: string
  name: string
  exam_type: string | null
  grade: number | null
  order: number
}

export type ProgramItemInitial = {
  id: string
  day_of_week: number
  subject_id: string | null
  baslik: string | null
  aciklama: string | null
}

// Gruplama: exam_type (TYT/AYT/LGS) veya grade (maarif). schedule-form-dialog ile aynı.
const GROUP_WEIGHT: Record<string, number> = { LGS: 8, TYT: 100, AYT: 101 }

function groupSubjects(subjects: SubjectOption[]) {
  const map = new Map<string, SubjectOption[]>()
  for (const s of subjects) {
    const key = s.exam_type
      ? s.exam_type.toUpperCase()
      : s.grade != null
        ? `${s.grade}. Sınıf`
        : "Diğer"
    const list = map.get(key)
    if (list) list.push(s)
    else map.set(key, [s])
  }
  const weightOf = (key: string, items: SubjectOption[]) =>
    GROUP_WEIGHT[key] ?? items[0]?.grade ?? 999
  return Array.from(map.entries())
    .map(([key, items]) => ({
      key,
      items: [...items].sort((a, b) => a.order - b.order),
    }))
    .sort((a, b) => weightOf(a.key, a.items) - weightOf(b.key, b.items))
}

const NO_SUBJECT = "__none__"

type Props = {
  studentId: string
  weekStart: string
  subjects: SubjectOption[]
  initial?: ProgramItemInitial
  initialDay?: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProgramItemDialog({
  studentId,
  weekStart,
  subjects,
  initial,
  initialDay,
  open,
  onOpenChange,
}: Props) {
  const [pending, startTransition] = useTransition()
  const isEdit = Boolean(initial?.id)

  const [day, setDay] = useState(
    (initial?.day_of_week ?? initialDay ?? 1).toString(),
  )
  const [subjectId, setSubjectId] = useState<string>(initial?.subject_id ?? NO_SUBJECT)
  const [baslik, setBaslik] = useState(initial?.baslik ?? "")
  const [aciklama, setAciklama] = useState(initial?.aciklama ?? "")
  const [error, setError] = useState<string | null>(null)

  const subjectGroups = groupSubjects(subjects)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const finalSubjectId = subjectId === NO_SUBJECT ? null : subjectId
    const finalBaslik = baslik.trim() || null
    if (!finalSubjectId && !finalBaslik) {
      setError("Ders seç veya konu/başlık gir.")
      return
    }

    const payload = {
      day_of_week: Number(day),
      subject_id: finalSubjectId,
      baslik: finalBaslik,
      aciklama: aciklama.trim() || null,
    }

    startTransition(async () => {
      const res =
        isEdit && initial
          ? await updateProgramItem(studentId, initial.id, payload)
          : await createProgramItem(studentId, weekStart, payload)

      if (res.success) {
        toast.success(isEdit ? "Kalem güncellendi." : "Kalem eklendi.")
        onOpenChange(false)
      } else {
        setError(res.error ?? "İşlem başarısız.")
        toast.error(res.error ?? "İşlem başarısız.")
      }
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (pending) return
        onOpenChange(o)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Kalemi Düzenle" : "Yeni Kalem"}</DialogTitle>
          <DialogDescription>
            Haftalık programa gün + ders/konu ekle.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="day">Gün</Label>
            <Select value={day} onValueChange={setDay}>
              <SelectTrigger id="day">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAYS.map((d) => (
                  <SelectItem key={d.num} value={d.num.toString()}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="subject">Ders (opsiyonel)</Label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger id="subject">
                <SelectValue placeholder="Ders seç" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value={NO_SUBJECT}>Ders yok</SelectItem>
                {subjectGroups.map((g) => (
                  <SelectGroup key={g.key}>
                    <SelectLabel>{g.key}</SelectLabel>
                    {g.items.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="baslik">Konu / Başlık</Label>
            <Input
              id="baslik"
              value={baslik}
              onChange={(e) => setBaslik(e.target.value)}
              maxLength={120}
              placeholder="ör. Türev — soru çözümü, Paragraf tekrarı"
            />
            <p className="text-xs text-zinc-500">Ders seçmediysen bu alan zorunlu.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="aciklama">Açıklama (opsiyonel)</Label>
            <Textarea
              id="aciklama"
              value={aciklama}
              onChange={(e) => setAciklama(e.target.value)}
              maxLength={500}
              placeholder="Kısa açıklama, kaynak, hedef vb."
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
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Vazgeç
            </Button>
            <Button type="submit" variant="accent" disabled={pending}>
              {pending ? (
                "Kaydediliyor..."
              ) : isEdit ? (
                "Güncelle"
              ) : (
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
