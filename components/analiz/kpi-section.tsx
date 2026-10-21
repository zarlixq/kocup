import Link from "next/link"
import { ArrowDownRight, ArrowUpRight, Lightbulb, Minus, Sparkles, AlertCircle, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatSpan } from "@/lib/resources/video-match"
import { addDays } from "@/lib/analytics/analiz/filter"
import {
  loadDaily,
  loadExams,
  loadModulePresence,
  loadOverview,
  loadProgramStats,
  loadSubjects,
  loadTopics,
  loadWrongStats,
  type ComplianceWeekStat,
} from "@/lib/analytics/analiz/load"
import { buildInsights } from "@/lib/insights"
import { istanbulDateStr } from "@/lib/tz"
import { safeLoad, SectionError, fmtMinutes, linkFor, pct, type AnalizCtx } from "@/components/analiz/section"

/** Uyum KPI'ı için tutulan hafta sayısı (3 ay + önceki 3 ay). */
export const PROGRAM_WEEKS = 26

function avgCompliance(weeks: ComplianceWeekStat[], from: string | null, to: string): number | null {
  const list = weeks.filter((w) => w.percent !== null && (from === null || addDays(w.weekStart, 6) >= from) && w.weekStart <= to)
  if (list.length === 0) return null
  return Math.round(list.reduce((s, w) => s + (w.percent ?? 0), 0) / list.length)
}

type Delta = { value: number; unit: "%" | "puan" } | null

function change(cur: number, prev: number | null | undefined): Delta {
  if (prev === null || prev === undefined || prev === 0) return null
  return { value: Math.round(((cur - prev) / prev) * 100), unit: "%" }
}

function points(cur: number | null, prev: number | null): Delta {
  if (cur === null || prev === null) return null
  return { value: Math.round((cur - prev) * 10) / 10, unit: "puan" }
}

function Kpi({
  label,
  value,
  sub,
  delta,
  inverse = false,
  hasPrev,
}: {
  label: string
  value: string
  sub?: string
  delta?: Delta
  /** Düşüş iyi (ör. soru başına süre). */
  inverse?: boolean
  hasPrev: boolean
}) {
  const good = delta ? (inverse ? delta.value < 0 : delta.value > 0) : false
  const Icon = !delta || delta.value === 0 ? Minus : delta.value > 0 ? ArrowUpRight : ArrowDownRight
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums text-zinc-900">{value}</div>
      {sub && <div className="text-xs text-zinc-500">{sub}</div>}
      {hasPrev && (
        <div
          className={cn(
            "mt-1 flex items-center gap-0.5 text-xs tabular-nums",
            !delta || delta.value === 0 ? "text-zinc-400" : good ? "text-emerald-600" : "text-red-600",
          )}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden />
          {delta
            ? `${delta.value > 0 ? "+" : ""}${delta.value.toLocaleString("tr-TR")}${delta.unit === "%" ? "%" : " puan"} önceki döneme göre`
            : "Önceki dönemde veri yok"}
        </div>
      )}
    </div>
  )
}

export async function KpiSection({ ctx }: { ctx: AnalizCtx }) {
  const loaded = await safeLoad("KpiSection", async () => {
    const [ov, exams, program, presence] = await Promise.all([
      loadOverview(ctx.studentId, ctx.from, ctx.to, ctx.subjectId),
      loadExams(ctx.studentId, ctx.from, ctx.to, ctx.subjectId),
      loadProgramStats(ctx.studentId, PROGRAM_WEEKS),
      loadModulePresence(ctx.studentId),
    ])
    return { ov, exams, program, presence }
  })
  if (!loaded) return <SectionError title="Özet göstergeler" />
  const { ov, exams, program, presence } = loaded
  const { cur, prev } = ov
  const hasPrev = prev !== null
  const acc = pct(cur.correct, cur.questions)
  const prevAcc = prev ? pct(prev.correct, prev.questions) : null
  const secPerQ = cur.questions > 0 && cur.minutes > 0 ? Math.round((cur.minutes * 60) / cur.questions) : null
  const prevSecPerQ = prev && prev.questions > 0 && prev.minutes > 0 ? Math.round((prev.minutes * 60) / prev.questions) : null
  const prevFrom = ctx.from && ctx.days ? addDays(ctx.from, -ctx.days) : null
  const compliance = avgCompliance(program.weeks, ctx.from ?? addDays(ctx.to, -55), ctx.to)
  const prevCompliance = prevFrom && ctx.from ? avgCompliance(program.weeks, prevFrom, addDays(ctx.from, -1)) : null
  const last = exams[exams.length - 1]
  const sameType = last ? exams.filter((e) => e.exam_type === last.exam_type) : []
  const avgNet = sameType.length ? sameType.reduce((s, e) => s + e.net, 0) / sameType.length : null

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      <Kpi label="Toplam soru" value={cur.questions.toLocaleString("tr-TR")} delta={change(cur.questions, prev?.questions)} hasPrev={hasPrev} />
      <Kpi label="Doğru" value={cur.correct.toLocaleString("tr-TR")} delta={change(cur.correct, prev?.correct)} hasPrev={hasPrev} />
      <Kpi
        label="Başarı"
        value={acc === null ? "—" : `%${acc.toLocaleString("tr-TR")}`}
        delta={points(acc, prevAcc)}
        hasPrev={hasPrev}
      />
      <Kpi label="Çalışma süresi" value={fmtMinutes(cur.minutes)} delta={change(cur.minutes, prev?.minutes)} hasPrev={hasPrev} />
      <Kpi
        label="Aktif gün"
        value={String(cur.active_days)}
        sub={ov.streak > 0 ? `Seri: ${ov.streak} gün 🔥` : "Seri yok"}
        delta={change(cur.active_days, prev?.active_days)}
        hasPrev={hasPrev}
      />
      <Kpi
        label="Soru başına süre"
        value={secPerQ === null ? "—" : secPerQ >= 60 ? `${Math.floor(secPerQ / 60)} dk ${secPerQ % 60} sn` : `${secPerQ} sn`}
        delta={secPerQ !== null ? change(secPerQ, prevSecPerQ) : null}
        inverse
        hasPrev={hasPrev}
      />
      {presence.videos && (
        <Kpi
          label="İzlenen video"
          value={String(cur.videos)}
          sub={cur.video_seconds > 0 ? formatSpan(cur.video_seconds) : undefined}
          delta={change(cur.videos, prev?.videos)}
          hasPrev={hasPrev}
        />
      )}
      {ov.topics_total > 0 && (
        <Kpi
          label="Konu tamamlama"
          value={`%${Math.round((ov.topics_done / ov.topics_total) * 100)}`}
          sub={`${ov.topics_done}/${ov.topics_total} konu`}
          hasPrev={false}
        />
      )}
      {presence.program && compliance !== null && (
        <Kpi label="Program uyumu" value={`%${compliance}`} delta={points(compliance, prevCompliance)} hasPrev={hasPrev} />
      )}
      {last && (
        <Kpi
          label={`Son deneme (${last.exam_type.toUpperCase()})`}
          value={last.net.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}
          sub={
            avgNet !== null && sameType.length > 1
              ? `Ortalamaya göre ${last.net - avgNet >= 0 ? "+" : ""}${(last.net - avgNet).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} net`
              : "İlk deneme"
          }
          hasPrev={false}
        />
      )}
    </div>
  )
}

const TONE = {
  positive: { cls: "border-emerald-200 bg-emerald-50/60", icon: Sparkles, iconCls: "text-emerald-600" },
  warning: { cls: "border-orange-200 bg-orange-50/60", icon: AlertCircle, iconCls: "text-[#F97316]" },
  info: { cls: "border-[#1B6B8A]/20 bg-[#1B6B8A]/5", icon: Info, iconCls: "text-[#1B6B8A]" },
} as const

export async function InsightsSection({ ctx }: { ctx: AnalizCtx }) {
  const loaded = await safeLoad("InsightsSection", async () => {
    const [ov, subjects, topics, daily, exams, wrongs] = await Promise.all([
      loadOverview(ctx.studentId, ctx.from, ctx.to, ctx.subjectId),
      loadSubjects(ctx.studentId, ctx.from, ctx.to),
      loadTopics(ctx.studentId, ctx.from, ctx.to, ctx.subjectId, ctx.split),
      loadDaily(ctx.studentId, ctx.from, ctx.to, ctx.subjectId),
      loadExams(ctx.studentId, ctx.from, ctx.to, ctx.subjectId),
      loadWrongStats(ctx.studentId, ctx.from, ctx.to, ctx.subjectId),
    ])
    return { ov, subjects, topics, daily, exams, wrongs }
  })
  if (!loaded) return <SectionError title="İçgörüler" />
  const { ov, subjects, topics, daily, exams, wrongs } = loaded
  const insights = buildInsights({
    today: ctx.to > istanbulDateStr() ? istanbulDateStr() : ctx.to,
    daily,
    subjects: ctx.subjectId ? subjects.filter((s) => s.subject_id === ctx.subjectId) : subjects,
    topics,
    exams,
    streak: ov.streak,
    unrepeatedWrongs: wrongs.unrepeated,
  })
  if (insights.length === 0) return null
  return (
    <section aria-label="İçgörüler" className="space-y-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
        <Lightbulb className="h-4 w-4 text-[#F97316]" /> Senin için öne çıkanlar
      </h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {insights.map((i) => {
          const t = TONE[i.tone]
          return (
            <div key={i.id} className={cn("flex flex-col justify-between gap-2 rounded-2xl border p-4", t.cls)}>
              <p className="flex gap-2 text-sm text-zinc-800">
                <t.icon className={cn("mt-0.5 h-4 w-4 shrink-0", t.iconCls)} aria-hidden />
                {i.text}
              </p>
              <Link href={linkFor(ctx, i.target)} className="self-start text-sm font-medium text-[#1B6B8A] hover:underline">
                {i.cta} →
              </Link>
            </div>
          )
        })}
      </div>
    </section>
  )
}
