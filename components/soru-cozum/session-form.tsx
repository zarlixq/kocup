"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { AlertTriangle, CheckCircle2, History, Lock, NotebookPen, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SearchCombobox, type ComboOption } from "@/components/soru-cozum/search-combobox"
import { resolveCounts, type CountField } from "@/lib/soru-cozum/counts"
import { examKeyLabel, examOptionsFor, subjectExamKey, subjectsForExam } from "@/lib/soru-cozum/segment"
import type { SessionFormData } from "@/lib/soru-cozum/form-data"
import { istanbulDateStr } from "@/lib/tz"
import { createSessionAction, updateSessionAction, type SessionInput } from "@/app/ogrenci/soru-cozum/actions"

export type SessionInitial = {
  subject_id: string
  topic_id: string | null
  date: string
  total: number
  correct: number
  wrong: number
  empty: number
  duration_minutes: number | null
  resource_id: string | null
}

type Mode = { kind: "create" } | { kind: "edit"; sessionId: string; initial: SessionInitial; locked: boolean }

const COUNT_FIELDS: { key: CountField; label: string; tone: string }[] = [
  { key: "total", label: "Soru", tone: "text-zinc-900" },
  { key: "correct", label: "Doğru", tone: "text-emerald-600" },
  { key: "wrong", label: "Yanlış", tone: "text-red-600" },
  { key: "empty", label: "Boş", tone: "text-zinc-500" },
]

type Raw = Record<CountField, string>
const EMPTY_RAW: Raw = { total: "", correct: "", wrong: "", empty: "" }

function toNum(s: string): number | null {
  const t = s.trim()
  return t === "" ? null : Number(t)
}

export function SessionForm({ data, mode }: { data: SessionFormData; mode: Mode }) {
  const router = useRouter()
  const today = istanbulDateStr()
  const initial = mode.kind === "edit" ? mode.initial : null
  const locked = mode.kind === "edit" && mode.locked

  const subjectById = useMemo(() => new Map(data.subjects.map((s) => [s.id, s])), [data.subjects])
  const topicById = useMemo(() => new Map(data.topics.map((t) => [t.id, t])), [data.topics])

  const initialSubject = initial ? subjectById.get(initial.subject_id) : undefined
  const initialExamKey = initialSubject ? subjectExamKey(initialSubject) : null
  const examOptions = useMemo(
    () => examOptionsFor(data.grade, data.subjects, initialExamKey),
    [data.grade, data.subjects, initialExamKey],
  )

  const [examKey, setExamKey] = useState<string>(initialExamKey ?? examOptions[0]?.key ?? "")
  const [subjectId, setSubjectId] = useState<string | null>(initial?.subject_id ?? null)
  const [topicId, setTopicId] = useState<string | null>(initial?.topic_id ?? null)
  const [raw, setRaw] = useState<Raw>(
    initial
      ? { total: String(initial.total), correct: String(initial.correct), wrong: String(initial.wrong), empty: String(initial.empty) }
      : EMPTY_RAW,
  )
  const [date, setDate] = useState(initial?.date ?? today)
  const [duration, setDuration] = useState(initial?.duration_minutes != null ? String(initial.duration_minutes) : "")
  const [resourceId, setResourceId] = useState<string | null>(initial?.resource_id ?? null)
  const [submitted, setSubmitted] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const subjects = useMemo(() => subjectsForExam(data.subjects, examKey), [data.subjects, examKey])
  const topicOptions: ComboOption[] = useMemo(
    () =>
      data.topics
        .filter((t) => t.subject_id === subjectId)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((t) => ({ value: t.id, label: t.name })),
    [data.topics, subjectId],
  )
  const resourceOptions: ComboOption[] = useMemo(
    () =>
      data.resources
        // Ders seçiliyse o dersin + derssiz (genel) kaynaklar; seçili kaynak her zaman listede.
        .filter((r) => !subjectId || !r.subject_id || r.subject_id === subjectId || r.id === resourceId)
        .map((r) => ({
          value: r.id,
          label: r.name,
          hint: r.publisher,
          group: r.mine ? "Kaynaklarım" : "Katalog",
        })),
    [data.resources, subjectId, resourceId],
  )

  const counts = resolveCounts({
    total: toNum(raw.total),
    correct: toNum(raw.correct),
    wrong: toNum(raw.wrong),
    empty: toNum(raw.empty),
  })
  const derived = new Set(counts.status === "ok" ? counts.derived : [])

  const subject = subjectId ? subjectById.get(subjectId) : undefined
  const topic = topicId ? topicById.get(topicId) : undefined
  const durationNum = toNum(duration)
  const needsTopic = topicOptions.length > 0 && !topicId && !locked

  const preview = [
    subject ? `${examKeyLabel(subjectExamKey(subject))} ${subject.name}` : null,
    topic?.name ?? null,
    counts.status === "ok" ? `${counts.total} soru` : null,
    counts.status === "ok" ? `${counts.correct}D ${counts.wrong}Y ${counts.empty}B` : null,
    durationNum ? `${durationNum} dk` : null,
  ]
    .filter(Boolean)
    .join(" · ")

  function pickExam(key: string) {
    if (key === examKey) return
    setExamKey(key)
    setSubjectId(null)
    setTopicId(null)
  }

  function pickSubject(id: string) {
    if (id === subjectId) return
    setSubjectId(id)
    setTopicId(null)
  }

  function pickRecent(r: SessionFormData["recentTopics"][number]) {
    setExamKey(r.exam_key)
    setSubjectId(r.subject_id)
    setTopicId(r.topic_id)
  }

  function resetForNext() {
    setSaved(null)
    setSubmitted(false)
    setTopicId(null)
    setRaw(EMPTY_RAW)
    setDuration("")
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    if (!subjectId) return toast.error("Ders seçmelisin.")
    if (needsTopic) return toast.error("Konu seçmelisin.")
    if (counts.status !== "ok") return toast.error(counts.message)
    if (durationNum != null && (!Number.isInteger(durationNum) || durationNum <= 0)) {
      return toast.error("Süreyi dakika olarak gir.")
    }

    const input: SessionInput = {
      subject_id: subjectId,
      topic_id: topicId,
      date,
      total: toNum(raw.total),
      correct: toNum(raw.correct),
      wrong: toNum(raw.wrong),
      empty: toNum(raw.empty),
      duration_minutes: durationNum,
      resource_id: resourceId,
    }
    const summary = preview

    start(async () => {
      const res =
        mode.kind === "edit" ? await updateSessionAction(mode.sessionId, input) : await createSessionAction(input)
      if (!res.success) {
        toast.error(res.error ?? "Bir hata oluştu, tekrar deneyin.")
        return
      }
      if (mode.kind === "edit") {
        toast.success("Kayıt güncellendi.")
        router.push("/ogrenci/soru-cozum")
        return
      }
      toast.success("Kayıt eklendi.")
      setSaved(summary)
      router.refresh() // son kullanılan konu chip'leri güncellensin
    })
  }

  if (saved) {
    return (
      <div className="space-y-5 text-center py-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle2 className="h-7 w-7 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Kaydedildi</h2>
          <p className="mt-1 text-sm text-zinc-600">{saved}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button
            type="button"
            variant="outline"
            disabled
            className="relative"
            title="Yanlış defteri yakında"
          >
            <NotebookPen className="h-4 w-4" /> Yanlışlarını ekle
            <Badge className="ml-1 bg-orange-100 text-orange-700 border-0 text-[10px] px-1.5 py-0">Yakında</Badge>
          </Button>
          <Button type="button" variant="accent" onClick={resetForNext}>
            <Plus className="h-4 w-4" /> Yeni kayıt
          </Button>
          <Button asChild variant="ghost">
            <Link href="/ogrenci/soru-cozum">Soru çözüme dön</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {mode.kind === "create" && data.recentTopics.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
            <History className="h-3.5 w-3.5" /> Son çalıştığın konular
          </div>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
            {data.recentTopics.map((r) => {
              const active = topicId === r.topic_id
              return (
                <button
                  key={r.topic_id}
                  type="button"
                  onClick={() => pickRecent(r)}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1.5 text-left text-xs transition-colors",
                    active
                      ? "border-[#F97316] bg-orange-50 text-orange-800"
                      : "border-zinc-200 bg-white text-zinc-700 hover:border-orange-300 hover:bg-orange-50/50",
                  )}
                >
                  <span className="font-medium">{r.topic_name}</span>
                  <span className="text-zinc-400"> · {r.subject_name}</span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {locked && (
        <div className="flex items-start gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs text-zinc-600">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Bu kayıt koçunun atadığı bir konuya bağlı; ders ve konu değiştirilemez.
        </div>
      )}

      <section className="space-y-2">
        <Label>Sınav</Label>
        {examOptions.length === 0 ? (
          <p className="text-sm text-zinc-500">Sınıfın için tanımlı ders bulunamadı. Koçunla iletişime geç.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {examOptions.map((o) => (
              <button
                key={o.key}
                type="button"
                disabled={locked}
                onClick={() => pickExam(o.key)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed",
                  examKey === o.key
                    ? "bg-[#F97316] text-white shadow-sm"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 disabled:opacity-60",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <Label>Ders</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {subjects.map((s) => (
            <button
              key={s.id}
              type="button"
              disabled={locked}
              onClick={() => pickSubject(s.id)}
              className={cn(
                "rounded-lg border px-3 py-2.5 text-left text-sm transition-colors disabled:cursor-not-allowed",
                subjectId === s.id
                  ? "border-[#F97316] bg-orange-50 font-medium text-orange-900"
                  : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 disabled:opacity-60",
              )}
            >
              {s.name}
            </button>
          ))}
        </div>
        {submitted && !subjectId && <p className="text-xs text-red-600">Ders seçmelisin.</p>}
      </section>

      {subjectId && (topicOptions.length > 0 || topicId) && (
        <section className="space-y-2">
          <Label htmlFor="topic">Konu</Label>
          <SearchCombobox
            id="topic"
            options={topicOptions}
            value={topicId}
            onChange={setTopicId}
            disabled={locked}
            placeholder="Konu seç veya ara..."
            searchPlaceholder="Konu ara..."
            emptyText="Bu isimde konu yok."
          />
          {submitted && needsTopic && <p className="text-xs text-red-600">Konu seçmelisin.</p>}
        </section>
      )}

      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <Label>Sonuç</Label>
          <span className="text-xs text-zinc-400">Birini boş bırakırsan hesaplanır</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {COUNT_FIELDS.map((f) => {
            const isDerived = derived.has(f.key)
            const derivedValue = counts.status === "ok" ? counts[f.key] : null
            return (
              <div key={f.key} className="space-y-1">
                <label htmlFor={`count-${f.key}`} className={cn("block text-center text-xs font-medium", f.tone)}>
                  {f.label}
                </label>
                <Input
                  id={`count-${f.key}`}
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={raw[f.key]}
                  onChange={(e) => setRaw((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={isDerived && derivedValue != null ? String(derivedValue) : "–"}
                  className={cn(
                    "h-12 text-center text-lg font-semibold tabular-nums",
                    isDerived && "border-dashed border-orange-300 bg-orange-50/60 placeholder:text-orange-500",
                  )}
                />
                <p className={cn("text-center text-[10px] text-orange-600", !isDerived && "invisible")}>otomatik</p>
              </div>
            )
          })}
        </div>
        {counts.status === "mismatch" || counts.status === "invalid" ? (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {counts.message}
          </div>
        ) : counts.status === "incomplete" && submitted ? (
          <p className="text-xs text-red-600">{counts.message}</p>
        ) : null}
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="date">Tarih</Label>
          <Input
            id="date"
            type="date"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value)}
            required
            className="h-11"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="duration">
            Süre <span className="font-normal text-zinc-400">(dk, ops.)</span>
          </Label>
          <Input
            id="duration"
            type="number"
            inputMode="numeric"
            min="1"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="ör. 45"
            className="h-11"
          />
        </div>
      </section>

      <section className="space-y-1.5">
        <Label htmlFor="resource">
          Kaynak <span className="font-normal text-zinc-400">(opsiyonel)</span>
        </Label>
        <SearchCombobox
          id="resource"
          options={resourceOptions}
          value={resourceId}
          onChange={setResourceId}
          clearable
          placeholder="Kaynak seç veya ara..."
          searchPlaceholder="Kitap / yayınevi ara..."
          emptyText="Katalogda bulunamadı."
        />
      </section>

      {preview && (
        <div className="rounded-xl border border-orange-200 bg-orange-50/70 px-4 py-3">
          <div className="text-[11px] font-medium uppercase tracking-wide text-orange-700">Önizleme</div>
          <p className="mt-0.5 text-sm font-medium text-zinc-900">{preview}</p>
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending} className="h-11">
          İptal
        </Button>
        <Button
          type="submit"
          variant="accent"
          disabled={pending || counts.status === "mismatch" || counts.status === "invalid"}
          className="h-11 sm:min-w-40"
        >
          {pending ? "Kaydediliyor..." : mode.kind === "edit" ? "Değişiklikleri kaydet" : "Kaydet"}
        </Button>
      </div>
    </form>
  )
}
