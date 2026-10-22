"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { CheckCircle2, Loader2, RefreshCw, Sparkles, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { DAYS } from "@/lib/days"
import type { DraftItem } from "@/lib/upplan/scheduler"
import { decideMyProgramDraft, generateMyProgramDraft, previewRebuildMyWeek, rebuildMyProgramWeek } from "@/app/ogrenci/upplan/roadmap-actions"

export type ProgramDraftView = {
  status: "taslak" | "onaylandi" | "reddedildi" | "koca_onerildi"
  items: DraftItem[]
  studyMinutes: number
  examCount: number
  unplaced: number
  /** Playlist video blokları (dk) ve müsaitliğe sığmayan kısım. */
  videoMinutes?: number
  videoOverflowMinutes?: number
  /** "Bu haftayı yeniden oluştur" taslağı: onayda yerini bu taslağa bırakacak UpPlan bloğu sayısı. */
  replaceCount?: number
}

const TYPE_TONE: Record<DraftItem["block_type"], string> = {
  konu_calisma: "border-l-[#1B6B8A]",
  soru_cozum: "border-l-[#F97316]",
  tekrar: "border-l-emerald-500",
  deneme: "border-l-violet-500",
}

/** Gün gün taslak önizlemesi (öğrenci + koç ortak). */
export function DraftDays({
  items,
  selectable,
}: {
  items: DraftItem[]
  selectable?: { selected: Set<number>; toggle: (i: number) => void }
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {DAYS.map((d) => {
        const list = items.map((it, idx) => ({ it, idx })).filter(({ it }) => it.day_of_week === d.num)
        if (list.length === 0) return null
        return (
          <div key={d.num} className="rounded-xl border border-zinc-200 bg-white p-2.5">
            <div className="mb-1.5 text-xs font-semibold text-zinc-700">{d.label}</div>
            <ul className="space-y-1">
              {list.map(({ it, idx }) => (
                <li key={idx} className={cn("flex gap-2 rounded-md border-l-4 bg-zinc-50 px-2 py-1.5", TYPE_TONE[it.block_type])}>
                  {selectable && (
                    <input
                      type="checkbox"
                      className="mt-0.5 h-3.5 w-3.5 accent-[#1B6B8A]"
                      checked={selectable.selected.has(idx)}
                      onChange={() => selectable.toggle(idx)}
                      aria-label={`${it.baslik} seç`}
                    />
                  )}
                  <div className="min-w-0">
                    <div className="text-[11px] tabular-nums text-zinc-500">
                      {it.start_time}–{it.end_time}
                    </div>
                    <div className="truncate text-xs font-medium text-zinc-900">{it.baslik}</div>
                    {it.hedef_soru && <div className="text-[11px] text-zinc-500">{it.hedef_soru} soru</div>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}

export function ProgramDraftPanel({
  weekStart,
  weekLabel,
  draft,
  coached,
}: {
  weekStart: string
  weekLabel: string
  draft: ProgramDraftView | null
  coached: boolean
}) {
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(draft?.status === "taslak")
  const [rebuild, setRebuild] = useState<{ replace: number; keep: number } | null>(null)

  function askRebuild() {
    start(async () => {
      const res = await previewRebuildMyWeek(weekStart)
      if (!res.success || !res.data) return void toast.error(res.error ?? "Program okunamadı.")
      setRebuild(res.data)
    })
  }

  function confirmRebuild() {
    start(async () => {
      const res = await rebuildMyProgramWeek(weekStart)
      setRebuild(null)
      if (!res.success || !res.data) return void toast.error(res.error ?? "Taslak oluşturulamadı.")
      toast.success(
        res.data.coached
          ? "Yeni program önerin koçuna iletildi."
          : `Yeni taslak hazır: onaylarsan ${res.data.replace} UpPlan bloğu bununla değişecek.`,
      )
      setOpen(true)
    })
  }

  function generate() {
    start(async () => {
      const res = await generateMyProgramDraft(weekStart)
      if (!res.success) return void toast.error(res.error ?? "Taslak oluşturulamadı.")
      if (res.data?.count === 0) toast.info("Bu hafta için eklenecek yeni blok çıkmadı.")
      else toast.success(res.data?.coached ? "Program önerin koçuna iletildi." : "Program taslağın hazır.")
      setOpen(true)
    })
  }

  function decide(approve: boolean) {
    start(async () => {
      const res = await decideMyProgramDraft(weekStart, approve)
      if (!res.success) return void toast.error(res.error ?? "İşlem başarısız.")
      if (!approve) return void toast.success("Taslak reddedildi.")
      const replaced = res.data?.replaced ?? 0
      toast.success(`${res.data?.count ?? 0} blok programına eklendi${replaced ? `, ${replaced} eski UpPlan bloğu kaldırıldı` : ""}.`)
    })
  }

  const showDraft = draft && (draft.status === "taslak" || draft.status === "koca_onerildi") && open
  return (
    <section className="space-y-3 rounded-2xl border border-[#1B6B8A]/25 bg-[#1B6B8A]/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[#1B6B8A]" />
          <div>
            <div className="text-sm font-semibold text-zinc-900">UpPlan program önerisi · {weekLabel}</div>
            <div className="text-xs text-zinc-600">
              {draft?.status === "onaylandi"
                ? "Bu haftanın önerisi programına eklendi."
                : draft?.status === "koca_onerildi"
                  ? "Öneri koçunun onayını bekliyor."
                  : "Aktif hedeflerine göre bloklar, müsaitliğine ve odak süren kadar."}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {draft && draft.status !== "onaylandi" && !open && (
            <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
              Önizle
            </Button>
          )}
          <Button size="sm" variant={draft ? "outline" : "accent"} onClick={generate} disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />} {draft ? "Yeniden oluştur" : "Öneri oluştur"}
          </Button>
          <Button size="sm" variant="ghost" onClick={askRebuild} disabled={pending}>
            <RefreshCw className="h-3.5 w-3.5" /> Bu haftayı yeniden oluştur
          </Button>
        </div>
      </div>

      <AlertDialog open={!!rebuild} onOpenChange={(o) => !pending && !o && setRebuild(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bu haftayı yeniden oluştur?</AlertDialogTitle>
            <AlertDialogDescription>
              {rebuild?.replace
                ? `UpPlan'ın eklediği, tamamlanmamış ${rebuild.replace} blok (bugün ve sonrası) yeni taslakla değişecek.`
                : "Değişecek UpPlan bloğu yok; yeni taslak mevcut programının boşluklarına yerleşir."}{" "}
              {rebuild?.keep ? `${rebuild.keep} kalem korunacak: tamamlananlar, senin ve koçunun eklediği bloklar, geçmiş günler.` : ""}{" "}
              Önce taslağı görürsün; bloklar ancak onaylayınca değişir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRebuild} disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />} Taslağı oluştur
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {showDraft && (
        <>
          {draft.items.length > 0 && (
            <div className="flex flex-wrap gap-x-4 text-xs text-zinc-600 tabular-nums">
              <span>{Math.round(draft.studyMinutes / 60)} saat çalışma</span>
              {/* Haftadaki toplam deneme (programda zaten olan + öneri) — program sayfasıyla aynı sayı. */}
              <span>Haftada {draft.examCount} deneme</span>
              {!!draft.videoMinutes && <span>{draft.videoMinutes} dk playlist videosu (konu çalışmasına sayıldı)</span>}
              {draft.unplaced > 0 && <span className="text-amber-700">{draft.unplaced} blok sığmadı</span>}
              {!!draft.replaceCount && (
                <span className="font-medium text-[#1B6B8A]">Onaylarsan {draft.replaceCount} UpPlan bloğu bununla değişir</span>
              )}
              {!!draft.videoOverflowMinutes && (
                <span className="text-amber-700">{draft.videoOverflowMinutes} dk video müsaitliğe sığmadı</span>
              )}
            </div>
          )}
          {draft.items.length === 0 && !!draft.replaceCount && (
            <p className="text-sm text-amber-700">Yeni taslakta blok çıkmadı; onaylarsan {draft.replaceCount} UpPlan bloğu kaldırılır.</p>
          )}
          {draft.items.length === 0 && !draft.replaceCount ? (
            <p className="text-sm text-zinc-600">Eklenecek blok yok: aktif hedeflerin bu hafta için zaten yerleşmiş ya da hedefin yok.</p>
          ) : (
            <DraftDays items={draft.items} />
          )}
          {draft.status === "taslak" && !coached && (draft.items.length > 0 || !!draft.replaceCount) && (
            <div className="flex flex-wrap justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => decide(false)} disabled={pending}>
                <X className="h-3.5 w-3.5" /> Reddet
              </Button>
              <Button size="sm" variant="accent" onClick={() => decide(true)} disabled={pending}>
                <CheckCircle2 className="h-3.5 w-3.5" /> Onayla ve programa ekle
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
