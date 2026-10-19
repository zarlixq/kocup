"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatDate } from "@/lib/format"
import { EXAM_DATES, FOCUS_OPTIONS, type FocusMinutes } from "@/lib/upplan/config"
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
}

const GRADES = [5, 6, 7, 8, 9, 10, 11, 12] as const

export function ProfileStep({ initial, today, nextHref }: { initial: ProfileStepInitial; today: string; nextHref: string }) {
  const router = useRouter()
  const [status, setStatus] = useState(initial.status)
  const [grade, setGrade] = useState<number | null>(initial.grade)
  const [segment, setSegment] = useState(initial.segment)
  const [alan, setAlan] = useState<Alan | null>(initial.alan)
  const [availability, setAvailability] = useState<Availability>(initial.availability)
  const [focus, setFocus] = useState<FocusMinutes>(initial.focus_minutes)
  const [department, setDepartment] = useState(initial.target_department ?? "")
  const [ranking, setRanking] = useState(initial.target_ranking != null ? String(initial.target_ranking) : "")
  const [pending, start] = useTransition()

  const exam = EXAM_DATES[segment]
  const daysLeft = Math.max(
    Math.round((Date.parse(`${exam.date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000),
    0,
  )

  function submit() {
    start(async () => {
      const res = await saveUpplanProfile({
        status,
        grade: status === "lise" ? grade : null,
        segment,
        alan: segment === "lgs" ? null : alan,
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
          {exam.label}: {formatDate(exam.date, "dd.MM.yyyy")}
          {exam.estimated && " (tahmini)"} · {daysLeft} gün kaldı
        </p>
      </Field>

      {segment === "yks" && (
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
