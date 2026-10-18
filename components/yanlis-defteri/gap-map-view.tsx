"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { AlertCircle, CalendarPlus, Info, NotebookPen, Target } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { ErrorDistributionChart, GapTrendChart } from "@/components/yanlis-defteri/gap-charts"
import {
  ATOM_TYPE_LABEL,
  CONFIDENCE_LABEL,
  CONFIDENCE_TONE,
  ERROR_TYPES,
  type Confidence,
  type ErrorType,
} from "@/lib/yanlis-defteri/constants"
import type { GapAtom, GapMapData } from "@/lib/yanlis-defteri/load"
import { addGapGoal, addGapReviewBlock } from "@/app/ogrenci/yanlis-defteri/actions"

type Mode = "student" | "readonly"

// Skor = konuda çözülen soru başına atoma düşen yanlış (Bayesian düzeltilmiş,
// bkz. migration 205). UI'da "100 soruda ~X" olarak okunur.
function per100(score: number) {
  const v = score * 100
  return v >= 10 ? Math.round(v).toString() : v.toFixed(1).replace(".", ",")
}

function ConfidenceChip({ c, className }: { c: Confidence; className?: string }) {
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap", CONFIDENCE_TONE[c], className)}>
      {CONFIDENCE_LABEL[c]}
    </span>
  )
}

export function GapMapView({ data, mode, emptyHref }: { data: GapMapData; mode: Mode; emptyHref?: string }) {
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null)

  const bySubject = useMemo(() => {
    const map = new Map<string, { label: string } & Record<ErrorType, number>>()
    for (const d of data.distribution) {
      const row = map.get(d.subject_id) ?? ({ label: d.subject_name, ...zero() } as { label: string } & Record<ErrorType, number>)
      row[d.error_type] += d.cnt
      map.set(d.subject_id, row)
    }
    return map
  }, [data.distribution])

  const byTopic = useMemo(() => {
    const map = new Map<string, { label: string } & Record<ErrorType, number>>()
    for (const d of data.distribution) {
      if (subjectFilter && d.subject_id !== subjectFilter) continue
      const row = map.get(d.topic_id) ?? ({ label: d.topic_name, ...zero() } as { label: string } & Record<ErrorType, number>)
      row[d.error_type] += d.cnt
      map.set(d.topic_id, row)
    }
    return Array.from(map.values()).sort((a, b) => total(b) - total(a)).slice(0, 10)
  }, [data.distribution, subjectFilter])

  const topicGroups = useMemo(() => {
    const map = new Map<string, { topic: string; subject: string; questions: number; confidence: Confidence; atoms: GapAtom[] }>()
    for (const a of data.atoms) {
      const g = map.get(a.topic_id) ?? { topic: a.topic_name, subject: a.subject_name, questions: a.topic_questions, confidence: a.confidence, atoms: [] }
      g.atoms.push(a)
      map.set(a.topic_id, g)
    }
    return Array.from(map.entries())
      .map(([id, g]) => ({ id, ...g, atoms: g.atoms.sort((x, y) => y.score - x.score), wrongs: g.atoms.reduce((s, a) => s + a.wrong_count, 0) }))
      .sort((a, b) => b.wrongs - a.wrongs || b.questions - a.questions)
  }, [data.atoms])

  if (data.totalWrongs === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-orange-200 bg-gradient-to-b from-orange-50/60 to-white px-6 py-12 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100">
          <NotebookPen className="h-6 w-6 text-[#F97316]" />
        </div>
        <h3 className="font-semibold text-zinc-900">{mode === "student" ? "Yanlış defterin henüz boş" : "Henüz yanlış kaydı yok"}</h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-zinc-500">
          {mode === "student"
            ? "Soru çözüm kaydı girdiğinde yanlışlarının nedenini işaretle; açıkların burada konu ve bilgi atomu bazında belirir."
            : "Öğrenci soru kayıtlarındaki yanlışların nedenini işaretledikçe açık haritası burada oluşur."}
        </p>
        {mode === "student" && emptyHref && (
          <Button asChild variant="accent" className="mt-5">
            <Link href={emptyHref}>Soru kaydı ekle</Link>
          </Button>
        )}
      </div>
    )
  }

  const subjects = Array.from(bySubject.entries())

  return (
    <div className="space-y-6">
      {/* ── En büyük 5 açık ── */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold text-zinc-900">
            {mode === "student" ? "En büyük 5 açığın" : "En büyük 5 açık"}
          </h2>
          <span className="text-xs text-zinc-500 tabular-nums">
            {data.attributedWrongs}/{data.totalWrongs} yanlış bir bilgi atomuna bağlı
          </span>
        </div>
        {data.top.length === 0 ? (
          <div className="flex items-start gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
            Henüz bir bilgi atomuna bağlanmış yanlış yok. &quot;Bilgi eksikliği&quot; ya da &quot;Hiç fikrim yok&quot;
            işaretlediğin yanlışlarda hangi bilgiyi kaçırdığını seçtikçe en büyük açıkların burada sıralanır.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.top.map((a, i) => (
              <GapCard key={a.atom_id} atom={a} rank={i + 1} mode={mode} />
            ))}
          </div>
        )}
      </section>

      {/* ── Hata tipi dağılımı ── */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-zinc-900">Hata tipi dağılımı</h2>
          <span className="text-xs text-zinc-400">Bilgi eksikliği ≠ işlem hatası: çözümü farklı</span>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <div className="mb-1 text-xs font-medium text-zinc-500">Ders bazında</div>
            <ErrorDistributionChart rows={subjects.map(([, r]) => r)} />
          </div>
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-1.5 text-xs font-medium text-zinc-500">
              Konu bazında
              <div className="flex flex-wrap gap-1">
                <FilterChip active={subjectFilter == null} onClick={() => setSubjectFilter(null)}>
                  Tümü
                </FilterChip>
                {subjects.map(([id, r]) => (
                  <FilterChip key={id} active={subjectFilter === id} onClick={() => setSubjectFilter(id)}>
                    {r.label}
                  </FilterChip>
                ))}
              </div>
            </div>
            <ErrorDistributionChart rows={byTopic} />
          </div>
        </div>
      </section>

      {/* ── 4 haftalık trend ── */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
        <h2 className="mb-3 text-sm font-semibold text-zinc-900">Son 4 hafta</h2>
        <GapTrendChart weeks={data.trend} />
      </section>

      {/* ── Konu → atom drill-down ── */}
      <section className="space-y-2">
        <h2 className="text-base font-semibold text-zinc-900">Konu → bilgi atomu</h2>
        {topicGroups.length === 0 ? (
          <p className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-500">
            Çalıştığın konular için bilgi atomları henüz eklenmedi. Hata tipi dağılımı yine de yukarıda.
          </p>
        ) : (
          <Accordion type="multiple" className="rounded-2xl border border-zinc-200 bg-white px-4">
            {topicGroups.map((g) => (
              <AccordionItem key={g.id} value={g.id}>
                <AccordionTrigger className="py-3 hover:no-underline">
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 text-left">
                    <span className="font-medium text-zinc-900">{g.topic}</span>
                    <span className="text-xs text-zinc-400">{g.subject}</span>
                    <span className="ml-auto flex items-center gap-2 pr-2">
                      <span className="text-xs tabular-nums text-zinc-500">
                        {g.wrongs} yanlış · {g.questions} soru
                      </span>
                      <ConfidenceChip c={g.confidence} />
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="divide-y divide-zinc-100">
                    {g.atoms.map((a) => (
                      <li key={a.atom_id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                        <span className="min-w-0 flex-1">
                          <span className={cn("font-medium", a.wrong_count > 0 ? "text-zinc-900" : "text-zinc-500")}>{a.atom_name}</span>
                          <span className="ml-1.5 text-[11px] text-zinc-400">{ATOM_TYPE_LABEL[a.atom_type] ?? a.atom_type}</span>
                          {a.prerequisites.length > 0 && a.wrong_count > 0 && (
                            <span className="mt-0.5 block text-[11px] text-amber-700">
                              Önce kontrol et: {a.prerequisites.map((p) => p.name).join(", ")}
                            </span>
                          )}
                        </span>
                        <span className="text-xs tabular-nums text-zinc-500">{a.wrong_count} yanlış</span>
                        <span className="w-28 text-right text-xs tabular-nums text-zinc-700" title="Konuda çözülen soru başına bu atoma düşen yanlış (az veride derse göre düzeltilmiş)">
                          100 soruda ~{per100(a.score)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </section>

      <p className="flex items-start gap-1.5 text-xs text-zinc-500">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Açık skoru: konuda çözülen soru başına o bilgiye düşen yanlış. Az soru çözülen konularda skor, dersteki genel
        yanlış oranına doğru dengelenir; 20 sorunun altındaki konular &quot;yetersiz veri&quot; sayılır.
      </p>
    </div>
  )
}

function GapCard({ atom, rank, mode }: { atom: GapAtom; rank: number; mode: Mode }) {
  const [pending, start] = useTransition()

  function run(kind: "goal" | "block") {
    start(async () => {
      const res = kind === "goal" ? await addGapGoal(atom.atom_id) : await addGapReviewBlock(atom.atom_id)
      if (!res.success) toast.error(res.error ?? "Eklenemedi.")
      else toast.success(kind === "goal" ? "Hedef Konularım'a eklendi." : "Tekrar bloğu programına eklendi.")
    })
  }

  return (
    <div className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
            #{rank} · {atom.subject_name}
          </div>
          <div className="mt-0.5 font-semibold text-zinc-900">{atom.atom_name}</div>
          <div className="text-xs text-zinc-500">{atom.topic_name}</div>
        </div>
        <ConfidenceChip c={atom.confidence} />
      </div>
      <div className="mt-3 flex items-baseline gap-3 text-sm">
        <span className="text-2xl font-bold tabular-nums text-[#EA580C]">{atom.wrong_count}</span>
        <span className="text-zinc-500">yanlış · {atom.topic_questions} soruda</span>
      </div>
      {atom.confidence === "yetersiz" && (
        <p className="mt-1 text-[11px] text-zinc-500">Bu konuda az soru çözdün; daha çok soru çözdükçe skor netleşir.</p>
      )}
      {atom.prerequisites.length > 0 && (
        <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Önce şunu kontrol et: <span className="font-medium">{atom.prerequisites.map((p) => p.name).join(", ")}</span>
          </span>
        </div>
      )}
      {mode === "student" && (
        <div className="mt-auto flex gap-2 pt-3">
          <Button size="sm" variant="outline" className="flex-1" disabled={pending} onClick={() => run("goal")}>
            <Target className="h-3.5 w-3.5" /> Hedef ekle
          </Button>
          <Button size="sm" variant="accent" className="flex-1" disabled={pending} onClick={() => run("block")}>
            <CalendarPlus className="h-3.5 w-3.5" /> Tekrar bloğu
          </Button>
        </div>
      )}
    </div>
  )
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-medium",
        active ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200",
      )}
    >
      {children}
    </button>
  )
}

function zero(): Record<ErrorType, number> {
  return Object.fromEntries(ERROR_TYPES.map((t) => [t, 0])) as Record<ErrorType, number>
}

function total(r: Record<ErrorType, number>) {
  return ERROR_TYPES.reduce((s, t) => s + r[t], 0)
}

