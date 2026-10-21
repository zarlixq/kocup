"use client"

import { useMemo } from "react"
import { AlertTriangle, CalendarDays, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ALL_WEEKDAYS,
  WEEKDAY_SHORT,
  formatDateTr,
  previewPlan,
  type DayStructure,
  type PlanMode,
} from "@/lib/resources/playlist-plan"

export type PlanDraft = {
  enabled: boolean
  mode: PlanMode
  /** Günde N video (mode=video) ya da X dakika (mode=dakika). */
  videoCount: number
  minutes: number
  start: string
  weekdays: number[]
}

export type PlanPayload = { mode: PlanMode; amount: number | null; start: string; weekdays: number[] } | null

export function defaultPlanDraft(opts: { today: string; weekdays: number[]; dayStructure?: DayStructure | null }): PlanDraft {
  return {
    enabled: true,
    mode: opts.dayStructure?.detected ? "gun_yapisi" : "video",
    videoCount: 2,
    minutes: 60,
    start: opts.today,
    weekdays: opts.weekdays,
  }
}

export function planPayload(d: PlanDraft): PlanPayload {
  if (!d.enabled) return null
  return {
    mode: d.mode,
    amount: d.mode === "video" ? d.videoCount : d.mode === "dakika" ? d.minutes : null,
    start: d.start,
    weekdays: d.weekdays,
  }
}

const MODE_LABEL: Record<PlanMode, string> = {
  gun_yapisi: "Playlist'in gün yapısını takip et",
  video: "Günde N video",
  dakika: "Günde X dakika",
}

/**
 * Playlist'i güne yayma ayarları + canlı önizleme (bitiş tarihi, günlük yük,
 * müsaitlik uyarısı). Hesap lib/resources/playlist-plan.ts'te (sunucuyla aynı).
 */
export function PlanSettings({
  value,
  onChange,
  videos,
  dayStructure,
  availability,
}: {
  value: PlanDraft
  onChange: (next: PlanDraft) => void
  videos: { title: string; duration_seconds: number | null }[]
  dayStructure: DayStructure | null
  /** Hafta günü → UpPlan müsait dakika (ızgara yoksa null). */
  availability: Record<number, number> | null
}) {
  const set = (patch: Partial<PlanDraft>) => onChange({ ...value, ...patch })
  const amount = value.mode === "video" ? value.videoCount : value.mode === "dakika" ? value.minutes : null
  const preview = useMemo(
    () => (value.weekdays.length ? previewPlan(videos, value.mode, amount, value.start, value.weekdays) : null),
    [videos, value.mode, amount, value.start, value.weekdays],
  )
  // Seçili günlerde en düşük UpPlan müsaitliği (0'lar hariç) — günlük video yükü bunu aşıyor mu.
  const minAvail = availability
    ? Math.min(...value.weekdays.map((d) => availability[d] ?? 0).filter((m) => m > 0), Infinity)
    : Infinity
  const over = preview && Number.isFinite(minAvail) && preview.maxDayMinutes > minAvail

  return (
    <fieldset className="space-y-3 rounded-xl border border-zinc-200 p-3">
      <div className="flex items-center justify-between gap-2">
        <legend className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900">
          <CalendarDays className="h-4 w-4 text-[#1B6B8A]" /> Çalışma planı
        </legend>
        <label className="flex items-center gap-2 text-xs text-zinc-600">
          <input
            type="checkbox"
            checked={value.enabled}
            onChange={(e) => set({ enabled: e.target.checked })}
            className="h-4 w-4 accent-[#1B6B8A]"
          />
          Güne yay
        </label>
      </div>

      {value.enabled && (
        <>
          <div className="space-y-1.5" role="radiogroup" aria-label="Tempo">
            {(["gun_yapisi", "video", "dakika"] as const).map((m) => {
              const disabled = m === "gun_yapisi" && !dayStructure?.detected
              return (
                <label
                  key={m}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                    value.mode === m ? "border-[#1B6B8A] bg-[#1B6B8A]/5" : "border-zinc-200",
                    disabled && "cursor-not-allowed opacity-50",
                  )}
                >
                  <input
                    type="radio"
                    name="plan-mode"
                    checked={value.mode === m}
                    disabled={disabled}
                    onChange={() => set({ mode: m })}
                    className="h-4 w-4 accent-[#1B6B8A]"
                  />
                  <span className="flex-1">
                    {MODE_LABEL[m]}
                    {m === "gun_yapisi" && (
                      <span className="block text-xs text-zinc-500">
                        {dayStructure?.detected ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700">
                            <Sparkles className="h-3 w-3" /> Başlıklarda {dayStructure.days} günlük yapı algılandı
                          </span>
                        ) : (
                          "Başlıklarda “1. Gün, 2. Gün…” kalıbı bulunamadı"
                        )}
                      </span>
                    )}
                  </span>
                  {m === "video" && value.mode === "video" && (
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={20}
                      value={value.videoCount}
                      onChange={(e) => set({ videoCount: clamp(e.target.valueAsNumber, 1, 20) })}
                      className="h-9 w-20"
                      aria-label="Günde video sayısı"
                    />
                  )}
                  {m === "dakika" && value.mode === "dakika" && (
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={10}
                      max={600}
                      step={5}
                      value={value.minutes}
                      onChange={(e) => set({ minutes: clamp(e.target.valueAsNumber, 10, 600) })}
                      className="h-9 w-24"
                      aria-label="Günde dakika"
                    />
                  )}
                </label>
              )
            })}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="plan-start">Başlangıç</Label>
              <Input id="plan-start" type="date" value={value.start} onChange={(e) => e.target.value && set({ start: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Çalışacağın günler</Label>
              <div className="flex flex-wrap gap-1">
                {ALL_WEEKDAYS.map((d) => {
                  const on = value.weekdays.includes(d)
                  return (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={on}
                      onClick={() => set({ weekdays: on ? value.weekdays.filter((x) => x !== d) : [...value.weekdays, d].sort((a, b) => a - b) })}
                      className={cn(
                        "h-9 min-w-10 rounded-md border px-2 text-xs font-medium",
                        on ? "border-[#1B6B8A] bg-[#1B6B8A] text-white" : "border-zinc-200 bg-white text-zinc-500",
                      )}
                    >
                      {WEEKDAY_SHORT[d]}
                    </button>
                  )
                })}
              </div>
              {availability && <p className="text-[11px] text-zinc-500">Varsayılan: UpPlan müsaitlik ızgaran.</p>}
            </div>
          </div>

          {preview ? (
            <div className="rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
              Planlanan bitiş: <strong className="tabular-nums">{formatDateTr(preview.end)}</strong>
              <span className="text-zinc-500">
                {" "}
                · {preview.days} çalışma günü · günde ort. {preview.avgDayMinutes} dk
              </span>
            </div>
          ) : (
            <p className="text-xs text-red-600">En az bir gün seç.</p>
          )}
          {over && (
            <p className="flex items-start gap-1 text-xs text-amber-700">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              En yoğun gün {preview!.maxDayMinutes} dk; bazı günlerde müsaitliğin {minAvail} dk. Programında video bloğu müsaitliğe
              göre kısaltılır, kalan videolar ertesi güne kalabilir.
            </p>
          )}
        </>
      )}
    </fieldset>
  )
}

function clamp(n: number, min: number, max: number): number {
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : min
}
