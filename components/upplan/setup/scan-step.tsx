"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Check, ChevronDown, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { SCAN_AUTOSAVE_MS } from "@/lib/upplan/config"
import { SELF_ASSESSMENTS, SELF_ASSESSMENT_LABEL, type SelfAssessment } from "@/lib/upplan/mastery"
import type { ScanData } from "@/lib/upplan/load"
import { advanceSetup, saveSelfAssessments } from "@/app/ogrenci/upplan/actions"
import { Segmented } from "@/components/upplan/setup/segmented"

const TONE: Record<SelfAssessment, string> = {
  hic_gormedim: "bg-white text-red-700",
  eksik: "bg-white text-amber-700",
  biliyorum: "bg-white text-emerald-700",
}

const OPTIONS = SELF_ASSESSMENTS.map((s) => ({ value: s, label: SELF_ASSESSMENT_LABEL[s] }))

// Konu taraması: her konuya 3'lü seçim; ders bazında toplu işlem; değişiklikler
// kısa gecikmeyle toplu kaydedilir (kaydet-devam et).
export function ScanStep({ data, nextHref, isSetup }: { data: ScanData; nextHref: string; isSetup: boolean }) {
  const router = useRouter()
  const [statuses, setStatuses] = useState<Record<string, SelfAssessment>>(data.statuses)
  const [openId, setOpenId] = useState<string | null>(data.subjects[0]?.id ?? null)
  const [saving, setSaving] = useState(false)
  const [finishing, startFinish] = useTransition()
  const pending = useRef<Record<string, SelfAssessment>>({})
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const total = data.subjects.reduce((n, s) => n + s.topics.length, 0)
  const marked = data.subjects.reduce((n, s) => n + s.topics.filter((t) => statuses[t.id]).length, 0)
  const pct = total ? Math.round((marked / total) * 100) : 0

  async function flush(): Promise<boolean> {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    const batch = Object.entries(pending.current).map(([topic_id, status]) => ({ topic_id, status }))
    if (batch.length === 0) return true
    pending.current = {}
    setSaving(true)
    const res = await saveSelfAssessments(batch)
    setSaving(false)
    if (!res.success) {
      // Kaydedilemeyenleri tekrar kuyruğa al.
      for (const b of batch) pending.current[b.topic_id] ??= b.status
      toast.error(res.error ?? "Tarama kaydedilemedi.")
      return false
    }
    return true
  }

  function setMany(ids: string[], status: SelfAssessment) {
    setStatuses((prev) => {
      const next = { ...prev }
      for (const id of ids) next[id] = status
      return next
    })
    for (const id of ids) pending.current[id] = status
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => void flush(), SCAN_AUTOSAVE_MS)
  }

  function finish() {
    startFinish(async () => {
      if (!(await flush())) return
      if (isSetup) {
        const res = await advanceSetup("deneme")
        if (!res.success) return void toast.error(res.error ?? "Kaydedilemedi.")
      }
      router.push(nextHref)
    })
  }

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 -mx-4 space-y-1.5 bg-white/95 px-4 py-2 backdrop-blur sm:mx-0 sm:px-0">
        <div className="flex items-center justify-between text-xs text-zinc-600">
          <span className="tabular-nums">
            {marked}/{total} konu işaretlendi
          </span>
          <span className="flex items-center gap-1 text-zinc-400">
            {saving ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" /> Kaydediliyor
              </>
            ) : marked > 0 ? (
              <>
                <Check className="h-3 w-3" /> Kaydedildi
              </>
            ) : null}
          </span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-zinc-100"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label="Tarama ilerlemesi"
        >
          <div className="h-full rounded-full bg-[#1B6B8A] transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <p className="text-sm text-zinc-500">
        Emin olmadığın konuyu &quot;Eksik&quot; işaretle. Sonradan istediğin zaman değiştirebilirsin; soru çözdükçe skorun zaten
        kendini düzeltir.
      </p>

      <div className="space-y-2">
        {data.subjects.map((s) => {
          const open = openId === s.id
          const done = s.topics.filter((t) => statuses[t.id]).length
          const ids = s.topics.map((t) => t.id)
          return (
            <section key={s.id} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : s.id)}
                aria-expanded={open}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-900">{s.name}</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
                    done === s.topics.length ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-600",
                  )}
                >
                  {done}/{s.topics.length}
                </span>
                <ChevronDown className={cn("h-4 w-4 text-zinc-400 transition-transform", open && "rotate-180")} />
              </button>
              {open && (
                <div className="border-t border-zinc-100">
                  <div className="flex flex-wrap items-center gap-2 bg-zinc-50 px-4 py-2 text-xs">
                    <span className="text-zinc-500">Hepsi:</span>
                    {SELF_ASSESSMENTS.map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setMany(ids, st)}
                        className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 font-medium text-zinc-700 hover:border-zinc-400"
                      >
                        {SELF_ASSESSMENT_LABEL[st]}
                      </button>
                    ))}
                  </div>
                  <ul className="divide-y divide-zinc-100">
                    {s.topics.map((t) => (
                      <li key={t.id} className="flex flex-col gap-1.5 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-sm text-zinc-800">{t.name}</span>
                        <Segmented
                          label={t.name}
                          options={OPTIONS}
                          value={statuses[t.id] ?? null}
                          onChange={(v) => setMany([t.id], v)}
                          size="sm"
                          toneFor={(v) => TONE[v]}
                          className="w-full sm:w-auto"
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )
        })}
      </div>

      <div className="flex justify-end">
        <Button variant="accent" onClick={finish} disabled={finishing}>
          {finishing && <Loader2 className="h-4 w-4 animate-spin" />} {isSetup ? "Kaydet ve devam et" : "Kaydet"}
        </Button>
      </div>
    </div>
  )
}
