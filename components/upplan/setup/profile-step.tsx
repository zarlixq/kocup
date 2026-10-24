"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatDate } from "@/lib/format"
import { FOCUS_OPTIONS, type FocusMinutes } from "@/lib/upplan/config"
import { examFor, type ExamCalendar } from "@/lib/upplan/calendar"
import { eduEndYear, graduationYearForGrade, isContextBasedExamYear } from "@/lib/upplan/track"
import {
  ALANLAR,
  ALAN_LABEL,
  SEGMENTS,
  SEGMENT_LABEL,
  STATUSES,
  STATUS_LABEL,
  type Alan,
  type Availability,
  type Segment,
  type UpplanStatus,
} from "@/lib/upplan/profile"
import { saveUpplanProfile } from "@/app/ogrenci/upplan/actions"
import { Segmented } from "@/components/upplan/setup/segmented"
import { AvailabilityGrid } from "@/components/upplan/setup/availability-grid"

export type ProfileStepInitial = {
  status: UpplanStatus
  grade: number | null
  segment: Segment
  alan: Alan | null
  availability: Availability
  focus_minutes: FocusMinutes
  target_department: string | null
  target_ranking: number | null
  target_exam_year: number | null
  alan_egilimi: Alan | null
}

const GRADES = [5, 6, 7, 8, 9, 10, 11, 12] as const

export function ProfileStep({
  initial,
  today,
  nextHref,
  exams,
}: {
  initial: ProfileStepInitial
  today: string
  nextHref: string
  exams: ExamCalendar
}) {
  const router = useRouter()
  const [status, setStatus] = useState(initial.status)
  const [grade, setGrade] = useState<number | null>(initial.grade)
  const [segment, setSegment] = useState(initial.segment)
  const [alan, setAlan] = useState<Alan | null>(initial.alan)
  const [availability, setAvailability] = useState<Availability>(initial.availability)
  const [focus, setFocus] = useState<FocusMinutes>(initial.focus_minutes)
  const [department, setDepartment] = useState(initial.target_department ?? "")
  const [ranking, setRanking] = useState(initial.target_ranking != null ? String(initial.target_ranking) : "")
  const [examYear, setExamYear] = useState<number | null>(initial.target_exam_year)
  const [egilim, setEgilim] = useState<Alan | null>(initial.alan_egilimi)
  const [pending, start] = useTransition()

  // Sınav yılı = mezuniyet yılı (lise); mezunda seçim, yoksa bu eğitim yılının YKS'si.
  const thisYear = eduEndYear(today)
  const earlyHigh = status === "lise" && grade !== null && grade <= 10
  const year =
    status === "lise" && grade !== null
      ? graduationYearForGrade(grade, today) - (segment === "lgs" ? 4 : 0)
      : (examYear ?? thisYear)
  const exam = examFor(exams, segment, year)
  const daysLeft = exam
    ? Math.max(Math.round((Date.parse(`${exam.exam_date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000), 0)
    : null
  const examLabel = `${segment === "lgs" ? "LGS" : "YKS"} ${year}`

  function submit() {
    start(async () => {
      const res = await saveUpplanProfile({
        status,
        grade: status === "lise" ? grade : null,
        segment,
        alan: segment === "lgs" || earlyHigh ? null : alan,
        alan_egilimi: earlyHigh && grade === 10 ? egilim : null,
        target_exam_year: status === "mezun" ? examYear : null,
        availability,
        focus_minutes: focus,
        target_department: department.trim() || null,
        target_ranking: ranking.trim() ? Number(ranking) : null,
      })
      if (!res.success) return void toast.error(res.error ?? "Kaydedilemedi.")
      toast.success("Profilin kaydedildi.")
      router.push(nextHref)
    })
  }

  return (
    <div className="space-y-6">
      <Field label="Durumun">
        <Segmented
          label="Durum"
          options={STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
          value={status}
          onChange={setStatus}
          className="w-full sm:w-auto"
        />
        {status === "lise" && (
          <div className="mt-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Sınıf">
            {GRADES.map((g) => (
              <button
                key={g}
                type="button"
                role="radio"
                aria-checked={grade === g}
                onClick={() => {
                  setGrade(g)
                  setSegment(g <= 8 ? "lgs" : "yks")
                }}
                className={
                  grade === g
                    ? "h-9 min-w-11 rounded-lg bg-[#1B6B8A] px-3 text-sm font-medium text-white"
                    : "h-9 min-w-11 rounded-lg border border-zinc-200 px-3 text-sm text-zinc-700 hover:border-zinc-400"
                }
              >
                {g}. sınıf
              </button>
            ))}
          </div>
        )}
      </Field>

      <Field label="Hazırlandığın sınav">
        <Segmented
          label="Sınav"
          options={SEGMENTS.map((s) => ({ value: s, label: SEGMENT_LABEL[s] }))}
          value={segment}
          onChange={setSegment}
        />
        <p className="mt-1.5 text-xs text-zinc-500">
          {examLabel}
          {exam ? `: ${formatDate(exam.exam_date, "dd.MM.yyyy")}${exam.tahmini ? " (tahmini)" : ""} · ${daysLeft} gün kaldı` : ""}
        </p>
        {status === "mezun" && segment === "yks" && (
          <div className="mt-2 space-y-1.5">
            <Segmented
              label="Hedef sınav yılı"
              options={[thisYear, thisYear + 1, thisYear + 2].map((y) => ({ value: y, label: `YKS ${y}` }))}
              value={year}
              onChange={setExamYear}
              size="sm"
            />
            {isContextBasedExamYear(year) && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                YKS {year}: TYT/AYT yapısı aynı kalıyor ama sorular beceri ve bağlam temelli olacak (Maarif modeli). Programına
                bağlam temelli soru blokları eklenir.
              </p>
            )}
          </div>
        )}
        {earlyHigh && (
          <p className="mt-1.5 text-xs text-zinc-500">
            {grade}. sınıfta programın okul müfredatına göre kurulur: okulda işlediğin konuları pekiştirir, bir iki hafta önden gidersin.
          </p>
        )}
      </Field>

      {earlyHigh && grade === 10 && (
        <Field label="Alan eğilimin (opsiyonel)" hint="2. dönemde düşünmeye başladığın alanı seçebilirsin; programı değiştirmez, ders ağırlığını hafifçe kaydırır.">
          <Segmented
            label="Alan eğilimi"
            options={ALANLAR.map((a) => ({ value: a, label: ALAN_LABEL[a] }))}
            value={egilim}
            onChange={setEgilim}
            className="w-full sm:w-auto"
            size="sm"
          />
        </Field>
      )}

      {segment === "yks" && !earlyHigh && (
        <Field label="Alanın">
          <Segmented
            label="Alan"
            options={ALANLAR.map((a) => ({ value: a, label: ALAN_LABEL[a] }))}
            value={alan}
            onChange={setAlan}
            className="w-full sm:w-auto"
            size="sm"
          />
          {alan === "dil" && <p className="mt-1.5 text-xs text-zinc-500">YDT konuları henüz sistemde yok; şimdilik TYT konuları taranır.</p>}
        </Field>
      )}

      <Field label="Haftalık müsaitliğin" hint="Ders çalışabileceğin saatleri boya. Sonraki fazda programın buna göre kurulacak.">
        <AvailabilityGrid value={availability} onChange={setAvailability} />
      </Field>

      <Field label="Odaklanabildiğin süre">
        <Segmented
          label="Odak süresi"
          options={FOCUS_OPTIONS.map((m) => ({ value: m, label: `${m} dk` }))}
          value={focus}
          onChange={setFocus}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="up-dept">Hedef bölüm (opsiyonel)</Label>
          <Input id="up-dept" value={department} onChange={(e) => setDepartment(e.target.value)} maxLength={200} placeholder="ör. Bilgisayar Mühendisliği" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="up-rank">Hedef sıralama (opsiyonel)</Label>
          <Input
            id="up-rank"
            inputMode="numeric"
            value={ranking}
            onChange={(e) => setRanking(e.target.value.replace(/\D/g, ""))}
            placeholder="ör. 25000"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button variant="accent" onClick={submit} disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Kaydet ve devam et
        </Button>
      </div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div>
        <div className="text-sm font-medium text-zinc-900">{label}</div>
        {hint && <p className="text-xs text-zinc-500">{hint}</p>}
      </div>
      {children}
    </div>
  )
}
