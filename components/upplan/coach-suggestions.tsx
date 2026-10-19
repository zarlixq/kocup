"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { CheckCheck, Loader2, RefreshCw, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { RoadmapItem } from "@/lib/upplan/roadmap"
import { DraftList } from "@/components/upplan/roadmap/roadmap-section"
import { DraftDays, type ProgramDraftView } from "@/components/upplan/program-draft-panel"
import {
  acceptProgramSuggestion,
  acceptRoadmapSuggestions,
  generateStudentProgramSuggestion,
  regenerateStudentRoadmap,
} from "@/app/koc/ogrenciler/[id]/upplan/actions"

// Koçlu öğrencide UpPlan önerileri: koç tümünü ya da seçtiklerini kendi ataması olarak kabul eder.
export function CoachRoadmapSuggestion({
  studentId,
  items,
  overflow,
  hasProfile,
}: {
  studentId: string
  items: RoadmapItem[] | null
  overflow: string | null
  hasProfile: boolean
}) {
  const selectableIds = (items ?? []).filter((i) => !i.existing && i.status !== "zaman_kalirsa").map((i) => i.topic_id)
  const firstWave = (items ?? []).filter((i) => !i.existing && i.status === "aktif").map((i) => i.topic_id)
  const [selected, setSelected] = useState<Set<string>>(new Set(firstWave))
  const [pending, start] = useTransition()

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function accept(ids: string[]) {
    start(async () => {
      const res = await acceptRoadmapSuggestions(studentId, ids)
      if (!res.success) return void toast.error(res.error ?? "Eklenemedi.")
      toast.success(`${res.data?.added ?? 0} hedef atandı${res.data?.skipped ? `, ${res.data.skipped} konu zaten aktifti` : ""}.`)
      setSelected(new Set())
    })
  }

  function regenerate() {
    start(async () => {
      const res = await regenerateStudentRoadmap(studentId)
      if (!res.success) return void toast.error(res.error ?? "Hesaplanamadı.")
      toast.success("Öneri yeniden hesaplandı.")
    })
  }

  if (!hasProfile) {
    return <p className="text-sm text-zinc-500">Öğrenci UpPlan kurulumunu tamamlayınca yol haritası önerisi burada görünür.</p>
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900">
          <Sparkles className="h-4 w-4 text-[#1B6B8A]" /> UpPlan yol haritası önerisi
        </h3>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" onClick={regenerate} disabled={pending}>
            <RefreshCw className="h-3.5 w-3.5" /> {items ? "Yeniden hesapla" : "Öneri oluştur"}
          </Button>
          {items && (
            <>
              <Button size="sm" variant="outline" onClick={() => accept(selectableIds)} disabled={pending || selectableIds.length === 0}>
                Tümünü kabul et
              </Button>
              <Button size="sm" variant="accent" onClick={() => accept(Array.from(selected))} disabled={pending || selected.size === 0}>
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                <CheckCheck className="h-3.5 w-3.5" /> Seçilenleri ata ({selected.size})
              </Button>
            </>
          )}
        </div>
      </div>
      {overflow && <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">{overflow}</p>}
      {items ? (
        <DraftList items={items} selectable={{ selected, toggle }} />
      ) : (
        <p className="text-sm text-zinc-500">Henüz öneri yok.</p>
      )}
      <p className="text-xs text-zinc-400">Kabul ettiğin konular senin ataman olarak öğrenciye gider; tarih ve hedefleri sonra düzenleyebilirsin.</p>
    </section>
  )
}

export function CoachProgramSuggestion({
  studentId,
  weeks,
}: {
  studentId: string
  weeks: { weekStart: string; label: string; draft: ProgramDraftView | null }[]
}) {
  const [active, setActive] = useState(0)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [pending, start] = useTransition()
  const w = weeks[active]
  const draft = w.draft && (w.draft.status === "koca_onerildi" || w.draft.status === "taslak") ? w.draft : null

  function toggle(i: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  function generate() {
    start(async () => {
      const res = await generateStudentProgramSuggestion(studentId, w.weekStart)
      if (!res.success) return void toast.error(res.error ?? "Oluşturulamadı.")
      toast.success(`${res.data?.count ?? 0} bloklu öneri hazır.`)
      setSelected(new Set())
    })
  }

  function accept(all: boolean) {
    start(async () => {
      const res = await acceptProgramSuggestion(studentId, w.weekStart, all ? null : Array.from(selected))
      if (!res.success) return void toast.error(res.error ?? "Eklenemedi.")
      toast.success(`${res.data?.count ?? 0} blok programa eklendi.`)
      setSelected(new Set())
    })
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900">
          <Sparkles className="h-4 w-4 text-[#1B6B8A]" /> Haftalık program önerisi
        </h3>
        <div className="inline-flex rounded-lg bg-zinc-100 p-0.5 text-xs">
          {weeks.map((x, i) => (
            <button
              key={x.weekStart}
              type="button"
              onClick={() => {
                setActive(i)
                setSelected(new Set())
              }}
              className={i === active ? "rounded-md bg-white px-2.5 py-1 font-medium shadow-sm" : "px-2.5 py-1 text-zinc-500"}
            >
              {x.label}
            </button>
          ))}
        </div>
      </div>
      {draft && draft.items.length > 0 ? (
        <>
          <DraftDays items={draft.items} selectable={{ selected, toggle }} />
          <div className="flex flex-wrap justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={generate} disabled={pending}>
              <RefreshCw className="h-3.5 w-3.5" /> Yeniden oluştur
            </Button>
            <Button size="sm" variant="outline" onClick={() => accept(false)} disabled={pending || selected.size === 0}>
              Seçilenleri ekle ({selected.size})
            </Button>
            <Button size="sm" variant="accent" onClick={() => accept(true)} disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />} Tümünü programa ekle
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-zinc-200 px-3 py-3 text-sm text-zinc-500">
          <span>{w.draft?.status === "onaylandi" ? "Bu haftanın önerisi programa eklendi." : "Bu hafta için öneri yok."}</span>
          <Button size="sm" variant="outline" onClick={generate} disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />} Öneri oluştur
          </Button>
        </div>
      )}
    </section>
  )
}
