"use client"

import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"
import { ArrowDown, ArrowUp, CalendarRange, GripVertical, Loader2, Map as MapIcon, PlayCircle, RefreshCw, RotateCcw, Undo2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatDate } from "@/lib/format"
import { prereqViolations } from "@/lib/upplan/roadmap"
import type { RoadmapRow, RoadmapView } from "@/lib/upplan/roadmap-view"
import type { RoadmapItem } from "@/lib/upplan/roadmap"
import { monthLabel } from "@/lib/upplan/roadmap-view-shared"
import {
  approveMyRoadmap,
  generateMyRoadmap,
  setQueueOrder,
  setRoadmapItemRemoved,
  updateRoadmapTarget,
} from "@/app/ogrenci/upplan/roadmap-actions"

const BLOCK_LABEL: Record<RoadmapRow["block_type"], string> = {
  konu_calisma: "Konu çalışması",
  soru_cozum: "Soru çözümü",
  tekrar: "Tekrar",
}

const SOURCE_LABEL: Record<RoadmapRow["source"], string> = {
  upplan: "UpPlan",
  student: "Kendi hedefin",
  coach: "Koçundan",
}

type Tab = "aktif" | "sirada" | "zaman_kalirsa" | "tamamlandi"
const TABS: { key: Tab; label: string }[] = [
  { key: "aktif", label: "Aktif" },
  { key: "sirada", label: "Sırada" },
  { key: "zaman_kalirsa", label: "Zaman kalırsa" },
  { key: "tamamlandi", label: "Tamamlandı" },
]

const dd = (iso: string) => formatDate(iso, "dd.MM.yyyy")

export function RoadmapSection({ view, coached }: { view: RoadmapView; coached: boolean }) {
  const [pending, start] = useTransition()

  function generate() {
    start(async () => {
      const res = await generateMyRoadmap()
      if (!res.success) return void toast.error(res.error ?? "Yol haritası oluşturulamadı.")
      toast.success(res.data?.coached ? "Yol haritası önerin koçuna iletildi." : "Yol haritası taslağın hazır.")
    })
  }

  function approve() {
    start(async () => {
      const res = await approveMyRoadmap()
      if (!res.success) return void toast.error(res.error ?? "Onaylanamadı.")
      toast.success("Yol haritan aktif. İlk konular açıldı.")
    })
  }

  if (view.status === "yok") {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-[#1B6B8A]/30 bg-[#1B6B8A]/5 p-4 sm:flex-row sm:items-center">
        <MapIcon className="h-6 w-6 shrink-0 text-[#1B6B8A]" />
        <div className="flex-1">
          <div className="text-sm font-semibold text-zinc-900">Sınava kadar yol haritanı çıkaralım</div>
          <p className="text-sm text-zinc-600">
            Ustalık haritan, denemelerin ve haftalık müsaitliğine göre hangi konuyu ne zaman çalışacağını sıralar.
            {coached && " Koçun olduğu için öneri koçuna gider."}
          </p>
        </div>
        <Button variant="accent" size="sm" onClick={generate} disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Yol haritamı oluştur
        </Button>
      </div>
    )
  }

  if ((view.status === "taslak" || view.status === "koca_onerildi") && view.payload) {
    return (
      <div className="space-y-4">
        <Summary view={view} />
        {view.status === "koca_onerildi" ? (
          <p className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5 text-sm text-sky-900">
            Yol haritası önerin koçuna iletildi. Koçun kabul ettiği konular hedeflerin olarak burada görünecek.
          </p>
        ) : (
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" size="sm" onClick={generate} disabled={pending}>
              <RefreshCw className="h-3.5 w-3.5" /> Yeniden hesapla
            </Button>
            <Button variant="accent" size="sm" onClick={approve} disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />} Onayla ve başlat
            </Button>
          </div>
        )}
        <DraftList items={view.payload.items} />
      </div>
    )
  }

  return <ApprovedRoadmap view={view} onRegenerate={generate} regenerating={pending} />
}

function Summary({ view }: { view: RoadmapView }) {
  const p = view.payload!
  const counts = { aktif: 0, sirada: 0, zaman_kalirsa: 0 }
  for (const i of p.items) counts[i.status] += 1
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Haftalık çalışma" value={`${Math.round(p.weeklyMinutes / 60)} sa`} />
        <Stat label="Aynı anda konu" value={String(p.activeSlots)} />
        <Stat label="Planlanan konu" value={String(counts.aktif + counts.sirada)} />
        <Stat label="Deneme dönemi" value={dd(p.examPeriodStart)} />
      </div>
      {p.weeklyHours && <WeeklyHoursNote w={p.weeklyHours} />}
      {p.subjectHours && p.subjectHours.length > 0 && <SubjectHoursBar rows={p.subjectHours} />}
      {p.overflow && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">{p.overflow.message}</p>
      )}
      {p.notes.map((n) => (
        <p key={n} className="text-xs text-zinc-500">
          {n}
        </p>
      ))}
    </div>
  )
}

// "Bütün konular için haftada X saat gerekiyor; şu an Y saat" + ek saatle plana girecek dersler.
function WeeklyHoursNote({ w, emphasize }: { w: NonNullable<RoadmapView["payload"]>["weeklyHours"] & object; emphasize?: boolean }) {
  const short = w.required > w.current
  const step = w.steps.find((x) => x.hours > w.current) ?? w.steps[0]
  return (
    <div
      className={
        short
          ? `rounded-xl border px-3 py-2.5 text-sm ${emphasize ? "border-amber-300 bg-amber-50 text-amber-900" : "border-amber-200 bg-amber-50/60 text-amber-900"}`
          : "rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900"
      }
    >
      <p>
        Bütün konuları sınava kadar bitirmek için haftada yaklaşık <strong className="tabular-nums">{w.required} saat</strong>{" "}
        gerekiyor; şu an <strong className="tabular-nums">{w.current} saat</strong> çalışıyorsun.
      </p>
      {short && step && (
        <p className="mt-1 text-xs">
          Haftada <strong className="tabular-nums">{step.hours} saat</strong> çalışırsan şu dersler de tamamen plana girer:{" "}
          {step.subjects.join(", ")}.
        </p>
      )}
    </div>
  )
}

// Ders bazlı ayrılan saat: plana giren konular + sürekli pratik (deneme dönemine kadar).
const BAR_COLORS = ["#1B6B8A", "#F97316", "#10B981", "#6250d6", "#eda100", "#2a78d6", "#EC4899", "#06B6D4", "#a1a1aa"]

function SubjectHoursBar({ rows }: { rows: { subject_id: string; subject_name: string; hours: number }[] }) {
  const total = rows.reduce((n, r) => n + r.hours, 0)
  const shown = rows.slice(0, 8)
  const rest = rows.slice(8).reduce((n, r) => n + r.hours, 0)
  const parts = rest > 0 ? [...shown, { subject_id: "diger", subject_name: "Diğer", hours: rest }] : shown
  return (
    <div className="space-y-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2.5">
      <div className="text-xs font-medium text-zinc-700">
        Derslere ayrılan süre <span className="font-normal text-zinc-500">· toplam {total} saat, saat başına puan getirisine göre</span>
      </div>
      <div className="flex h-3 overflow-hidden rounded-full bg-zinc-100" role="img" aria-label="Ders bazlı saat dağılımı">
        {parts.map((r, i) => (
          <div key={r.subject_id} title={`${r.subject_name}: ${r.hours} saat`} style={{ width: `${(r.hours / total) * 100}%`, backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-zinc-600">
        {parts.map((r, i) => (
          <span key={r.subject_id} className="inline-flex items-center gap-1 tabular-nums">
            <span aria-hidden className="h-2 w-2 rounded-full" style={{ backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }} />
            {r.subject_name} {r.hours} sa
          </span>
        ))}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2">
      <div className="text-[11px] text-zinc-500">{label}</div>
      <div className="text-base font-semibold tabular-nums text-zinc-900">{value}</div>
    </div>
  )
}

/** Taslak: dalga dalga konular (ilk 3 dalga açık). */
export function DraftList({ items, selectable }: { items: RoadmapItem[]; selectable?: { selected: Set<string>; toggle: (id: string) => void } }) {
  const waves = useMemo(() => {
    const m = new Map<string, RoadmapItem[]>()
    for (const i of items) {
      const key = i.status === "zaman_kalirsa" ? "z" : String(i.wave)
      ;(m.get(key) ?? m.set(key, []).get(key)!).push(i)
    }
    return Array.from(m.entries()).sort(([a], [b]) => (a === "z" ? 1 : b === "z" ? -1 : Number(a) - Number(b)))
  }, [items])
  return (
    <div className="space-y-3">
      {waves.map(([key, list], idx) => (
        <details key={key} open={idx < 3} className="rounded-2xl border border-zinc-200 bg-white">
          <summary className="cursor-pointer select-none px-4 py-2.5 text-sm font-semibold text-zinc-900">
            {key === "z" ? "Zaman kalırsa" : `${key}. dalga`}{" "}
            <span className="font-normal text-zinc-500">
              · {list.length} konu{key !== "z" && list[0] ? ` · ${dd(list[0].start)} – ${dd(list[0].end)}` : ""}
            </span>
          </summary>
          <ul className="divide-y divide-zinc-100 border-t border-zinc-100">
            {list.map((i) => (
              <li key={i.topic_id} className="flex gap-3 px-4 py-2.5">
                {selectable && (
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-[#1B6B8A]"
                    checked={selectable.selected.has(i.topic_id)}
                    disabled={!!i.existing}
                    onChange={() => selectable.toggle(i.topic_id)}
                    aria-label={`${i.topic_name} seç`}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-sm font-medium text-zinc-900">{i.topic_name}</span>
                    <span className="text-xs text-zinc-500">{i.subject_name}</span>
                    {i.existing && <span className="text-[11px] text-sky-700">{i.existing.source === "coach" ? "Koçundan" : "Mevcut hedef"}</span>}
                  </div>
                  <div className="text-xs text-zinc-600">
                    {BLOCK_LABEL[i.block_type]} · {i.target_questions} soru · %{i.target_accuracy} doğruluk
                  </div>
                  {i.playlist && <PlaylistTag label={i.playlist.label} />}
                  {i.reasons[0] && <div className="mt-0.5 text-xs text-zinc-500">{i.reasons.slice(0, 2).join(" · ")}</div>}
                </div>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  )
}

function ApprovedRoadmap({ view, onRegenerate, regenerating }: { view: RoadmapView; onRegenerate: () => void; regenerating: boolean }) {
  const [tab, setTab] = useState<Tab>("aktif")
  const byStatus = (s: RoadmapRow["status"]) => view.rows.filter((r) => r.status === s)
  const removed = byStatus("iptal")

  return (
    <div className="space-y-4">
      {(view.newExamSince || view.playlistChanged) && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2.5 text-sm text-orange-900">
          <span>
            {view.newExamSince ? "Yeni deneme girdin." : "Playlist planın değişti."} Yol haritanı güncelleyelim mi?
          </span>
          <Button size="sm" variant="accent" onClick={onRegenerate} disabled={regenerating}>
            {regenerating && <Loader2 className="h-4 w-4 animate-spin" />} Güncelle
          </Button>
        </div>
      )}

      <nav className="flex gap-1 overflow-x-auto rounded-xl bg-zinc-100 p-1 text-sm" aria-label="Yol haritası sekmeleri">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            aria-pressed={tab === t.key}
            className={cn(
              "whitespace-nowrap rounded-lg px-3 py-1.5 font-medium",
              tab === t.key ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-900",
            )}
          >
            {t.label} <span className="tabular-nums text-zinc-400">{byStatus(t.key).length}</span>
          </button>
        ))}
      </nav>

      {tab === "aktif" && <ActiveList rows={byStatus("aktif")} />}
      {tab === "sirada" && <QueueList rows={byStatus("sirada")} edges={view.edges} allRows={view.rows} />}
      {tab === "zaman_kalirsa" && (
        <div className="space-y-2">
          {view.payload?.weeklyHours && view.payload.weeklyHours.required > view.payload.weeklyHours.current && (
            <WeeklyHoursNote w={view.payload.weeklyHours} emphasize />
          )}
          {byStatus("zaman_kalirsa").length > 0 && (
            <p className="text-xs text-zinc-500">Bu konular saat başına en az puan getirenler; kapasiten sınava kadar bunlara yetmiyor.</p>
          )}
          <SimpleList rows={byStatus("zaman_kalirsa")} empty="Zaman kalırsa listen boş — tüm konular plana sığıyor." restore />
        </div>
      )}
      {tab === "tamamlandi" && <SimpleList rows={byStatus("tamamlandi")} empty="Henüz tamamlanan konu yok." />}

      {removed.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-zinc-500">Çıkardığın konular ({removed.length})</summary>
          <SimpleList rows={removed} empty="" restore />
        </details>
      )}

      {view.timeline.length > 0 && <Timeline months={view.timeline} />}

      <div className="flex justify-end">
        <Button size="sm" variant="ghost" onClick={onRegenerate} disabled={regenerating}>
          <RefreshCw className="h-3.5 w-3.5" /> Yol haritasını yeniden hesapla
        </Button>
      </div>
    </div>
  )
}

/** Konu sırasını belirleyen playlist: "Bıyıklı Matematik · 3. Gün". */
function PlaylistTag({ label }: { label: string }) {
  return (
    <span className="mt-1 inline-flex max-w-full items-center gap-1 truncate rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">
      <PlayCircle className="h-3 w-3 shrink-0" aria-hidden />
      {label}
    </span>
  )
}

function ActiveList({ rows }: { rows: RoadmapRow[] }) {
  if (rows.length === 0) return <Empty text="Aktif konu yok." />
  return (
    <ul className="space-y-2">
      {rows.map((r) => {
        const pct = r.hedef_soru ? Math.min(100, Math.round((r.cozulen / r.hedef_soru) * 100)) : 0
        return (
          <li key={r.id} className="rounded-2xl border border-zinc-200 bg-white p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <span className="text-sm font-semibold text-zinc-900">{r.topic_name}</span>{" "}
                <span className="text-xs text-zinc-500">{r.subject_name}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {r.pace && (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-medium",
                      r.pace === "zamaninda" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700",
                    )}
                  >
                    {r.pace === "zamaninda" ? "Zamanında" : "Geride"}
                  </span>
                )}
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600">{SOURCE_LABEL[r.source]}</span>
              </div>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${r.topic_name} ilerleme`}>
              <div className="h-full rounded-full bg-[#F97316]" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-3 text-xs text-zinc-600 tabular-nums">
              <span>
                {r.cozulen}/{r.hedef_soru ?? "—"} soru
              </span>
              <span>Ustalık {Math.round(r.effective)}</span>
              <span>Bitiş {dd(r.end)}</span>
              <span>{BLOCK_LABEL[r.block_type]}</span>
            </div>
            {r.playlist && <PlaylistTag label={r.playlist} />}
            {r.reasons[0] && <p className="mt-1 text-xs text-zinc-500">{r.reasons.slice(0, 2).join(" · ")}</p>}
          </li>
        )
      })}
    </ul>
  )
}

function QueueList({ rows, edges, allRows }: { rows: RoadmapRow[]; edges: RoadmapView["edges"]; allRows: RoadmapRow[] }) {
  const [order, setOrder] = useState(rows.map((r) => r.id))
  const [dragId, setDragId] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const byId = new Map(rows.map((r) => [r.id, r]))
  // Kuyruk sıraya göre; prop değişince (sunucu tazelemesi) yeni satırlar eklenir.
  const ids = [...order.filter((id) => byId.has(id)), ...rows.map((r) => r.id).filter((id) => !order.includes(id))]

  const nameOfTopic = new Map(allRows.map((r) => [r.topic_id, r.topic_name]))
  const topicOrder = [
    ...allRows.filter((r) => r.status === "aktif" || r.status === "tamamlandi").map((r) => r.topic_id),
    ...ids.map((id) => byId.get(id)!.topic_id),
  ]
  const violations = prereqViolations(topicOrder, edges)

  function commit(next: string[]) {
    setOrder(next)
    start(async () => {
      const res = await setQueueOrder(next)
      if (!res.success) toast.error(res.error ?? "Sıra kaydedilemedi.")
    })
  }

  function move(id: string, dir: -1 | 1) {
    const i = ids.indexOf(id)
    const j = i + dir
    if (j < 0 || j >= ids.length) return
    const next = [...ids]
    ;[next[i], next[j]] = [next[j], next[i]]
    commit(next)
  }

  if (ids.length === 0) return <Empty text="Sırada bekleyen konu yok." />
  return (
    <div className="space-y-2">
      {violations.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
          Ön koşul uyarısı:{" "}
          {violations
            .slice(0, 3)
            .map((v) => `${nameOfTopic.get(v.topic)} konusu ${nameOfTopic.get(v.prereq)} konusundan önce geliyor`)
            .join("; ")}
          . Sıralamayı yine de kaydedebilirsin.
        </div>
      )}
      <ul className="space-y-1.5">
        {ids.map((id, i) => {
          const r = byId.get(id)!
          return (
            <li
              key={id}
              draggable
              onDragStart={() => setDragId(id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (!dragId || dragId === id) return
                const next = ids.filter((x) => x !== dragId)
                next.splice(next.indexOf(id), 0, dragId)
                setDragId(null)
                commit(next)
              }}
              className={cn("flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-2 py-2", dragId === id && "opacity-50")}
            >
              <GripVertical className="hidden h-4 w-4 shrink-0 cursor-grab text-zinc-300 md:block" aria-hidden />
              <span className="w-6 text-center text-xs tabular-nums text-zinc-400">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-zinc-900">
                  {r.topic_name} <span className="text-xs text-zinc-500">{r.subject_name}</span>
                </div>
                <div className="text-[11px] text-zinc-500 tabular-nums">
                  {BLOCK_LABEL[r.block_type]} · {dd(r.start)} – {dd(r.end)}
                </div>
                {r.playlist && <PlaylistTag label={r.playlist} />}
              </div>
              <TargetEditor row={r} />
              <div className="flex flex-col">
                <button type="button" aria-label="Yukarı taşı" disabled={pending || i === 0} onClick={() => move(id, -1)} className="rounded p-1 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30">
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button type="button" aria-label="Aşağı taşı" disabled={pending || i === ids.length - 1} onClick={() => move(id, 1)} className="rounded p-1 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30">
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              </div>
              <RemoveButton id={id} />
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function TargetEditor({ row }: { row: RoadmapRow }) {
  const [value, setValue] = useState(String(row.hedef_soru ?? ""))
  const [pending, start] = useTransition()
  const changed = value !== String(row.hedef_soru ?? "")
  return (
    <div className="flex items-center gap-1">
      <Input
        aria-label={`${row.topic_name} hedef soru`}
        inputMode="numeric"
        value={value}
        onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
        className="h-8 w-16 text-right text-xs tabular-nums"
      />
      {changed && (
        <Button
          size="sm"
          variant="outline"
          className="h-8 px-2 text-xs"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await updateRoadmapTarget(row.id, Number(value))
              if (!res.success) toast.error(res.error ?? "Kaydedilemedi.")
              else toast.success("Hedef güncellendi.")
            })
          }
        >
          Kaydet
        </Button>
      )}
    </div>
  )
}

function RemoveButton({ id, restore }: { id: string; restore?: boolean }) {
  const [pending, start] = useTransition()
  return (
    <button
      type="button"
      aria-label={restore ? "Sıraya geri al" : "Yol haritasından çıkar"}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await setRoadmapItemRemoved(id, !restore)
          if (!res.success) toast.error(res.error ?? "İşlem başarısız.")
        })
      }
      className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : restore ? <Undo2 className="h-4 w-4" /> : <X className="h-4 w-4" />}
    </button>
  )
}

function SimpleList({ rows, empty, restore }: { rows: RoadmapRow[]; empty: string; restore?: boolean }) {
  if (rows.length === 0) return empty ? <Empty text={empty} /> : null
  return (
    <ul className="divide-y divide-zinc-100 rounded-2xl border border-zinc-200 bg-white">
      {rows.map((r) => (
        <li key={r.id} className="flex items-center gap-3 px-3 py-2">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm text-zinc-900">
              {r.topic_name} <span className="text-xs text-zinc-500">{r.subject_name}</span>
            </div>
            {r.reasons[0] && <div className="truncate text-[11px] text-zinc-500">{r.reasons[0]}</div>}
          </div>
          <span className="text-xs tabular-nums text-zinc-500">Ustalık {Math.round(r.effective)}</span>
          {restore && <RemoveButton id={r.id} restore />}
        </li>
      ))}
    </ul>
  )
}

function Timeline({ months }: { months: RoadmapView["timeline"] }) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900">
        <CalendarRange className="h-4 w-4 text-[#1B6B8A]" /> Sınava kadar zaman çizelgesi
      </h3>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {months.map((m) => (
          <div key={m.month} className="rounded-xl border border-zinc-200 bg-white p-3">
            <div className="mb-1 text-xs font-semibold text-zinc-700">{monthLabel(m.month)}</div>
            {m.topics.length === 0 ? (
              <div className="text-xs text-zinc-400">—</div>
            ) : (
              <div className="flex flex-wrap gap-1">
                {m.topics.slice(0, 12).map((t) => (
                  <span
                    key={t.name}
                    className={cn("rounded-full px-2 py-0.5 text-[11px]", t.status === "aktif" ? "bg-orange-50 text-orange-800" : "bg-zinc-100 text-zinc-600")}
                  >
                    {t.name}
                  </span>
                ))}
                {m.topics.length > 12 && <span className="text-[11px] text-zinc-400">+{m.topics.length - 12}</span>}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-dashed border-zinc-200 px-4 py-6 text-sm text-zinc-500">
      <RotateCcw className="h-4 w-4" /> {text}
    </div>
  )
}
