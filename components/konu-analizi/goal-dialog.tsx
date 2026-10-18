"use client"

import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"
import { History } from "lucide-react"
import { cn } from "@/lib/utils"
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
import { SearchCombobox, type ComboOption } from "@/components/soru-cozum/search-combobox"
import { examKeyLabel, examOptionsFor, subjectExamKey, subjectsForExam } from "@/lib/soru-cozum/segment"
import { addDays } from "@/lib/soru-cozum/summary"
import { istanbulDateStr } from "@/lib/tz"
import type { SessionFormData } from "@/lib/soru-cozum/form-data"
import { createMyGoal, updateMyGoal, type GoalInput } from "@/app/ogrenci/konularim/actions"

export type GoalFormData = Pick<SessionFormData, "grade" | "subjects" | "topics" | "recentTopics">

export type GoalInitial = {
  id: string
  topic_id: string
  son_tarih: string
  hedef_soru: number | null
  hedef_dogruluk: number | null
  notes: string | null
}

function toNum(s: string): number | null {
  const t = s.trim()
  return t === "" ? null : Number(t)
}

export function GoalDialog({
  data,
  initial,
  onOpenChange,
}: {
  data: GoalFormData
  initial?: GoalInitial
  onOpenChange: (open: boolean) => void
}) {
  const today = istanbulDateStr()
  const topicById = useMemo(() => new Map(data.topics.map((t) => [t.id, t])), [data.topics])
  const subjectById = useMemo(() => new Map(data.subjects.map((s) => [s.id, s])), [data.subjects])

  const initialTopic = initial ? topicById.get(initial.topic_id) : undefined
  const initialSubject = initialTopic ? subjectById.get(initialTopic.subject_id) : undefined
  const initialExamKey = initialSubject ? subjectExamKey(initialSubject) : null
  const examOptions = useMemo(
    () => examOptionsFor(data.grade, data.subjects, initialExamKey),
    [data.grade, data.subjects, initialExamKey],
  )

  const [examKey, setExamKey] = useState(initialExamKey ?? examOptions[0]?.key ?? "")
  const [subjectId, setSubjectId] = useState<string | null>(initialSubject?.id ?? null)
  const [topicId, setTopicId] = useState<string | null>(initial?.topic_id ?? null)
  const [sonTarih, setSonTarih] = useState(initial?.son_tarih ?? addDays(today, 7))
  const [hedefSoru, setHedefSoru] = useState(initial?.hedef_soru != null ? String(initial.hedef_soru) : "")
  const [hedefDogruluk, setHedefDogruluk] = useState(
    initial?.hedef_dogruluk != null ? String(initial.hedef_dogruluk) : "",
  )
  const [notes, setNotes] = useState(initial?.notes ?? "")
  const [pending, start] = useTransition()

  const subjectOptions: ComboOption[] = useMemo(
    () => subjectsForExam(data.subjects, examKey).map((s) => ({ value: s.id, label: s.name })),
    [data.subjects, examKey],
  )
  const topicOptions: ComboOption[] = useMemo(
    () =>
      data.topics
        .filter((t) => t.subject_id === subjectId)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((t) => ({ value: t.id, label: t.name })),
    [data.topics, subjectId],
  )

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!topicId) return toast.error("Konu seçmelisin.")
    const soru = toNum(hedefSoru)
    const dogruluk = toNum(hedefDogruluk)
    if (soru == null && dogruluk == null) return toast.error("Hedef soru sayısı veya hedef doğruluk gir.")
    if (soru != null && (!Number.isInteger(soru) || soru <= 0)) return toast.error("Hedef soru pozitif tam sayı olmalı.")
    if (dogruluk != null && (!Number.isInteger(dogruluk) || dogruluk < 1 || dogruluk > 100)) {
      return toast.error("Doğruluk hedefi 1 ile 100 arasında olmalı.")
    }

    const input: GoalInput = {
      topic_id: topicId,
      son_tarih: sonTarih,
      hedef_soru: soru,
      hedef_dogruluk: dogruluk,
      notes: notes.trim() || null,
    }
    start(async () => {
      const res = initial ? await updateMyGoal(initial.id, input) : await createMyGoal(input)
      if (!res.success) {
        toast.error(res.error ?? "Bir hata oluştu, tekrar deneyin.")
        return
      }
      toast.success(initial ? "Hedef güncellendi." : "Hedef eklendi.")
      onOpenChange(false)
    })
  }

  return (
    <Dialog open onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Hedefi düzenle" : "Yeni konu hedefi"}</DialogTitle>
          <DialogDescription>
            İlerlemen, Soru Çözüm&apos;de bu konuyu seçerek girdiğin kayıtlardan otomatik hesaplanır.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!initial && data.recentTopics.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
                <History className="h-3.5 w-3.5" /> Son çalıştığın konular
              </div>
              <div className="flex flex-wrap gap-1.5">
                {data.recentTopics.map((r) => (
                  <button
                    key={r.topic_id}
                    type="button"
                    onClick={() => {
                      setExamKey(r.exam_key)
                      setSubjectId(r.subject_id)
                      setTopicId(r.topic_id)
                    }}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs transition-colors",
                      topicId === r.topic_id
                        ? "border-[#F97316] bg-orange-50 text-orange-800"
                        : "border-zinc-200 text-zinc-700 hover:bg-orange-50/50",
                    )}
                  >
                    {r.topic_name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {examOptions.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              {examOptions.map((o) => (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => {
                    if (o.key === examKey) return
                    setExamKey(o.key)
                    setSubjectId(null)
                    setTopicId(null)
                  }}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium",
                    examKey === o.key ? "bg-[#F97316] text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200",
                  )}
                >
                  {examKeyLabel(o.key)}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="goal-subject">Ders</Label>
              <SearchCombobox
                id="goal-subject"
                options={subjectOptions}
                value={subjectId}
                onChange={(v) => {
                  setSubjectId(v)
                  setTopicId(null)
                }}
                placeholder="Ders seç..."
                searchPlaceholder="Ders ara..."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="goal-topic">Konu</Label>
              <SearchCombobox
                id="goal-topic"
                options={topicOptions}
                value={topicId}
                onChange={setTopicId}
                disabled={!subjectId}
                placeholder={subjectId ? "Konu seç..." : "Önce ders seç"}
                searchPlaceholder="Konu ara..."
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="goal-date">Hedef tarih</Label>
              <Input
                id="goal-date"
                type="date"
                min={today}
                value={sonTarih}
                onChange={(e) => setSonTarih(e.target.value)}
                required
                className="h-11 px-2"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="goal-soru">Hedef soru</Label>
              <Input
                id="goal-soru"
                type="number"
                inputMode="numeric"
                min="1"
                placeholder="ör. 100"
                value={hedefSoru}
                onChange={(e) => setHedefSoru(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="goal-acc">Doğruluk %</Label>
              <Input
                id="goal-acc"
                type="number"
                inputMode="numeric"
                min="1"
                max="100"
                placeholder="ör. 80"
                value={hedefDogruluk}
                onChange={(e) => setHedefDogruluk(e.target.value)}
                className="h-11"
              />
            </div>
          </div>
          <p className="-mt-2 text-[11px] text-zinc-500">
            Soru sayısı, doğruluk ya da ikisini birden hedefleyebilirsin. Doğruluk en az 20 soruyla değerlendirilir.
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="goal-notes">
              Not <span className="font-normal text-zinc-400">(opsiyonel)</span>
            </Label>
            <Textarea
              id="goal-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ör. Önce konu anlatımı, sonra 3D soru bankası"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Vazgeç
            </Button>
            <Button type="submit" variant="accent" disabled={pending}>
              {pending ? "Kaydediliyor..." : initial ? "Kaydet" : "Hedefi ekle"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
