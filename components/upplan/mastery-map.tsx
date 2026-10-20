"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronDown, Hourglass, Pencil, ScanSearch } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/format"
import { UPPLAN_SQL_CONFIG } from "@/lib/upplan/config"
import {
  MASTERY_CONFIDENCE_TEXT,
  MASTERY_LABEL_TEXT,
  MASTERY_TONE,
  SELF_ASSESSMENT_LABEL,
  masteryLabel,
  type MasteryLabel,
} from "@/lib/upplan/mastery"
import { errorTypeLabel } from "@/lib/yanlis-defteri/constants"
import type { MasteryMapData, MasterySubject, MasteryTopic } from "@/lib/upplan/load"
import { MasteryTrendChart } from "@/components/upplan/mastery-trend-chart"

const LABELS: MasteryLabel[] = ["zayif", "gelisiyor", "iyi"]
const RANGE: Record<MasteryLabel, string> = {
  zayif: `0–${UPPLAN_SQL_CONFIG.label_gelisiyor}`,
  gelisiyor: `${UPPLAN_SQL_CONFIG.label_gelisiyor}–${UPPLAN_SQL_CONFIG.label_iyi}`,
  iyi: `${UPPLAN_SQL_CONFIG.label_iyi}+`,
}

export function MasteryMap({ data, mode }: { data: MasteryMapData; mode: "student" | "readonly" }) {
  if (data.subjects.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-10 text-center text-sm text-zinc-500">
        {mode === "student"
          ? "Henüz ustalık verin yok. Konu taramasını yap ya da soru kaydı gir."
          : "Öğrenci henüz UpPlan kurulumunu yapmadı ya da konu bazlı veri yok."}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="text-sm text-zinc-500">Genel ustalık</div>
          <div className="mt-1 text-4xl font-bold tabular-nums text-zinc-900">
            {data.overall.average === null ? "—" : data.overall.average.toFixed(0)}
          </div>
          <div className="mt-1 text-xs text-zinc-500 tabular-nums">
            {data.overall.assessed}/{data.overall.total} konu değerlendirildi
          </div>
          <ul className="mt-4 space-y-1.5" aria-label="Renk açıklaması">
            {LABELS.map((l) => (
              <li key={l} className="flex items-center gap-2 text-xs text-zinc-600">
                <span aria-hidden className={cn("h-2.5 w-2.5 rounded-full", MASTERY_TONE[l].bar)} />
                {MASTERY_LABEL_TEXT[l]} <span className="text-zinc-400 tabular-nums">{RANGE[l]}</span>
              </li>
            ))}
          </ul>
          {mode === "student" && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <Link href="/ogrenci/upplan/kurulum?adim=tarama">
                  <ScanSearch className="h-3.5 w-3.5" /> Taramayı düzenle
                </Link>
              </Button>
              <Button asChild size="sm" variant="ghost">
                <Link href="/ogrenci/upplan/kurulum?adim=profil">
                  <Pencil className="h-3.5 w-3.5" /> Profil
                </Link>
              </Button>
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 lg:col-span-2">
          <h3 className="mb-2 text-sm font-semibold text-zinc-900">Ortalama ustalık — son 8 hafta</h3>
          <MasteryTrendChart data={data.trend} />
        </div>
      </div>

      <div className="space-y-3">
        {data.subjects.map((s, i) => (
          <SubjectCard key={s.id} subject={s} defaultOpen={i === 0} />
        ))}
      </div>
    </div>
  )
}

function SubjectCard({ subject, defaultOpen }: { subject: MasterySubject; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const label = subject.average === null ? null : masteryLabel(subject.average)
  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50"
      >
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-zinc-900">{subject.name}</div>
          <div className="text-xs text-zinc-500 tabular-nums">
            {subject.assessed}/{subject.topics.length} konu değerlendirildi
          </div>
        </div>
        {label && (
          <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums", MASTERY_TONE[label].chip)}>
            {subject.average!.toFixed(0)}
          </span>
        )}
        <ChevronDown className={cn("h-4 w-4 text-zinc-400 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <ul className="divide-y divide-zinc-100 border-t border-zinc-100">
          {subject.topics.map((t) => (
            <TopicRow key={t.id} topic={t} />
          ))}
        </ul>
      )}
    </section>
  )
}

function TopicRow({ topic }: { topic: MasteryTopic }) {
  const [open, setOpen] = useState(false)
  const c = topic.cell
  const label = c?.label
  return (
    <li>
      <button
        type="button"
        onClick={() => c && setOpen((o) => !o)}
        aria-expanded={c ? open : undefined}
        className={cn("grid w-full grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 px-4 py-2.5 text-left", c && "hover:bg-zinc-50")}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-sm text-zinc-900">{topic.name}</span>
            {c?.forgetting && (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-700">
                <Hourglass className="h-3 w-3" /> Unutulmaya başlıyor
              </span>
            )}
          </div>
          <div className="mt-1 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-zinc-100">
            {c && label && (
              <div className={cn("h-full rounded-full", MASTERY_TONE[label].bar)} style={{ width: `${Math.max(c.effective, 2)}%` }} />
            )}
          </div>
          <div className="mt-1 text-[11px] text-zinc-500">
            {c
              ? [
                  MASTERY_CONFIDENCE_TEXT[c.confidence],
                  c.last_practiced_at ? `Son çalışma ${formatDate(c.last_practiced_at, "dd.MM.yyyy")}` : "Henüz çalışma kaydı yok",
                ].join(" · ")
              : "Veri yok"}
          </div>
        </div>
        <div className="text-right">
          {c && label ? (
            <>
              <div className={cn("text-lg font-semibold tabular-nums", MASTERY_TONE[label].text)}>{c.effective.toFixed(0)}</div>
              <div className="text-[11px] text-zinc-500">{MASTERY_LABEL_TEXT[label]}</div>
            </>
          ) : (
            <div className="text-sm text-zinc-300">—</div>
          )}
        </div>
      </button>
      {open && c && <TopicReason topic={topic} />}
    </li>
  )
}

function TopicReason({ topic }: { topic: MasteryTopic }) {
  const c = topic.cell!
  const b = c.breakdown
  const lines: string[] = []
  if (b.assessment) lines.push(`Konu taraması: "${SELF_ASSESSMENT_LABEL[b.assessment]}" → başlangıç ${b.prior.toFixed(0)}`)
  else lines.push(`Konu taraması yok → başlangıç ${b.prior.toFixed(0)} (düşük ağırlık)`)
  if (b.sessionQuestions > 0) {
    lines.push(
      `${b.sessionQuestions} soru (${b.sessionCount} kayıt)` +
        (b.sessionAccuracy !== null ? `, zaman ağırlıklı doğruluk %${b.sessionAccuracy.toFixed(0)}` : ""),
    )
  }
  if (b.examWrongs > 0) lines.push(`Denemelerde ${b.examWrongs} yanlış (her biri 2 soru ağırlığında)`)
  if (b.looseWrongs > 0) lines.push(`Yanlış defterinde ${b.looseWrongs} bağımsız yanlış`)
  if (b.crossWrongs > 0) {
    lines.push(`Başka konulardaki sorularda bu konunun bilgisinden ${b.crossWrongs} yanlış (her biri yarım soru ağırlığında)`)
  }
  if (c.stored !== c.effective) {
    lines.push(`Kayıtlı skor ${c.stored.toFixed(0)}; son çalışmadan beri geçen süre nedeniyle ${c.effective.toFixed(0)}`)
  }

  return (
    <div className="space-y-2 bg-zinc-50 px-4 py-3 text-xs text-zinc-700">
      <ul className="list-disc space-y-1 pl-4">
        {lines.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
      {b.wrongsByType.length > 0 && (
        <div>
          <span className="font-medium text-zinc-900">Hata tipleri: </span>
          {b.wrongsByType.map((w) => `${errorTypeLabel(w.type)} ${w.count}`).join(" · ")}
        </div>
      )}
      {topic.gapAtoms.length > 0 && (
        <div>
          <span className="font-medium text-zinc-900">Açık haritası: </span>
          {topic.gapAtoms
            .slice(0, 5)
            .map((a) => `${a.name} (${a.wrongs})`)
            .join(" · ")}
        </div>
      )}
    </div>
  )
}
