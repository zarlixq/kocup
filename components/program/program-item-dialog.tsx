"use client"

import { useMemo, useState, useTransition } from "react"
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SubjectSelect } from "@/components/konular/subject-select"
import { SearchCombobox, type ComboOption } from "@/components/soru-cozum/search-combobox"
import { DAYS } from "@/lib/days"
import type { ProgramItemInput } from "@/lib/program/item-schema"

export type SubjectOption = {
  id: string
  name: string
  exam_type: string | null
  grade: number | null
  order: number
}

export type TopicOption = { id: string; subject_id: string; name: string; order: number | null }

export type ProgramItemInitial = {
  id: string
  day_of_week: number
  start_time: string | null
  end_time: string | null
  subject_id: string | null
  topic_id: string | null
  baslik: string | null
  aciklama: string | null
  hedef_soru: number | null
}

const NO_SUBJECT = "__none__"

type Props = {
  subjects: SubjectOption[]
  topics?: TopicOption[]
  initial?: ProgramItemInitial
  initialDay?: number
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Koç ve öğrenci farklı server action'a bağlanır (board karar verir). */
  onSubmit: (input: ProgramItemInput, itemId?: string) => Promise<{ success: boolean; error?: string }>
}

export function ProgramItemDialog({
  subjects,
  topics = [],
  initial,
  initialDay,
  open,
  onOpenChange,
  onSubmit,
}: Props) {
  const [pending, startTransition] = useTransition()
  const isEdit = Boolean(initial?.id)

  const [day, setDay] = useState((initial?.day_of_week ?? initialDay ?? 1).toString())
  const [startTime, setStartTime] = useState(initial?.start_time ?? "")
  const [endTime, setEndTime] = useState(initial?.end_time ?? "")
  const [subjectId, setSubjectId] = useState<string>(initial?.subject_id ?? NO_SUBJECT)
  const [topicId, setTopicId] = useState<string | null>(initial?.topic_id ?? null)
  const [baslik, setBaslik] = useState(initial?.baslik ?? "")
  const [hedefSoru, setHedefSoru] = useState(initial?.hedef_soru != null ? String(initial.hedef_soru) : "")
  const [aciklama, setAciklama] = useState(initial?.aciklama ?? "")
  const [error, setError] = useState<string | null>(null)

  const topicOptions: ComboOption[] = useMemo(
    () =>
      topics
        .filter((t) => t.subject_id === subjectId)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((t) => ({ value: t.id, label: t.name })),
    [topics, subjectId],
  )

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const finalSubjectId = subjectId === NO_SUBJECT ? null : subjectId
    const finalBaslik = baslik.trim() || null
    if (!finalSubjectId && !finalBaslik) {
      setError("Ders seç veya konu/başlık gir.")
      return
    }
    if (endTime && !startTime) {
      setError("Bitiş saati için başlangıç saati de gir.")
      return
    }
    if (startTime && endTime && endTime <= startTime) {
      setError("Bitiş saati başlangıçtan sonra olmalı.")
      return
    }

    const payload: ProgramItemInput = {
      day_of_week: Number(day),
      start_time: startTime || null,
      end_time: endTime || null,
      subject_id: finalSubjectId,
      topic_id: finalSubjectId ? topicId : null,
      baslik: finalBaslik,
      aciklama: aciklama.trim() || null,
      hedef_soru: hedefSoru.trim() ? Number(hedefSoru) : null,
    }

    startTransition(async () => {
      const res = await onSubmit(payload, initial?.id)
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Kalemi Düzenle" : "Yeni Kalem"}</DialogTitle>
          <DialogDescription>Gün, saat aralığı ve ders/konu ekle.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
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
              <Label htmlFor="start_time">Başlangıç</Label>
              <Input
                id="start_time"
                type="time"
                step={300}
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end_time">Bitiş</Label>
              <Input
                id="end_time"
                type="time"
                step={300}
                value={endTime}
                min={startTime || undefined}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>
          <p className="-mt-2 text-xs text-zinc-500">Saat opsiyonel; boş bırakırsan gün içi serbest kalem olur.</p>

          <div className="space-y-1.5">
            <Label htmlFor="subject">Ders (opsiyonel)</Label>
            <SubjectSelect
              triggerId="subject"
              subjects={subjects}
              value={subjectId}
              onValueChange={(v) => {
                setSubjectId(v)
                setTopicId(null)
              }}
              leading={<SelectItem value={NO_SUBJECT}>Ders yok</SelectItem>}
            />
          </div>

          {subjectId !== NO_SUBJECT && topicOptions.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="topic">Konu (opsiyonel)</Label>
              <SearchCombobox
                id="topic"
                options={topicOptions}
                value={topicId}
                onChange={setTopicId}
                clearable
                placeholder="Konu seç veya ara..."
                searchPlaceholder="Konu ara..."
              />
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="baslik">Başlık</Label>
              <Input
                id="baslik"
                value={baslik}
                onChange={(e) => setBaslik(e.target.value)}
                maxLength={120}
                placeholder="ör. Soru çözümü, tekrar"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hedef_soru">Hedef soru</Label>
              <Input
                id="hedef_soru"
                type="number"
                inputMode="numeric"
                min="1"
                value={hedefSoru}
                onChange={(e) => setHedefSoru(e.target.value)}
                placeholder="ör. 40"
              />
            </div>
          </div>
          <p className="-mt-2 text-xs text-zinc-500">Ders seçmediysen başlık zorunlu.</p>

          <div className="space-y-1.5">
            <Label htmlFor="aciklama">Açıklama (opsiyonel)</Label>
            <Textarea
              id="aciklama"
              value={aciklama}
              onChange={(e) => setAciklama(e.target.value)}
              maxLength={500}
              placeholder="Kısa açıklama, kaynak vb."
              rows={2}
            />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
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
