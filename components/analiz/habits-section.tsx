import { CalendarDays, Scale } from "lucide-react"
import { cn } from "@/lib/utils"
import { CALENDAR_DAYS, loadDaily, loadSubjects, type DailyStat } from "@/lib/analytics/analiz/load"
import { addDays, fmtDay } from "@/lib/analytics/analiz/filter"
import { WeeklyMetricsChart, type WeeklyMetricsDatum } from "@/components/charts/weekly-metrics-chart"
import { safeLoad, Card, NotEnough, SectionCard, SectionError, fmtMinutes, pct, type AnalizCtx } from "@/components/analiz/section"
import { WeekdayChart } from "@/components/analiz/habits-charts"

/** Trend ve dağılımlar için gereken en az aktif gün. */
export const MIN_ACTIVE_DAYS = 3

const DOW = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"]

function dowIndex(iso: string): number {
  const d = new Date(`${iso}T00:00:00Z`).getUTCDay()
  return d === 0 ? 6 : d - 1
}

function weekStartOf(iso: string): string {
  return addDays(iso, -dowIndex(iso))
}

function weekly(daily: DailyStat[], from: string | null, to: string): WeeklyMetricsDatum[] {
  const inRange = daily.filter((d) => (from === null || d.day >= from) && d.day <= to)
  if (inRange.length === 0) return []
  const byWeek = new Map<string, { q: number; c: number; m: number }>()
  for (const d of inRange) {
    const ws = weekStartOf(d.day)
    const w = byWeek.get(ws) ?? { q: 0, c: 0, m: 0 }
    w.q += d.questions
    w.c += d.correct
    w.m += d.minutes
    byWeek.set(ws, w)
  }
  // İlk veri haftasından bugünün haftasına; boş haftalar 0.
  const out: WeeklyMetricsDatum[] = []
  for (let ws = weekStartOf(inRange[0].day); ws <= to; ws = addDays(ws, 7)) {
    const w = byWeek.get(ws) ?? { q: 0, c: 0, m: 0 }
    out.push({ label: fmtDay(ws), total: w.q, successRate: w.q ? Math.round((w.c / w.q) * 1000) / 10 : 0, durationMin: w.m })
  }
  return out
}

const LEVELS = ["bg-zinc-100", "bg-[#1B6B8A]/25", "bg-[#1B6B8A]/50", "bg-[#1B6B8A]/75", "bg-[#1B6B8A]"]

function ActivityCalendar({ daily, to }: { daily: DailyStat[]; to: string }) {
  const map = new Map(daily.map((d) => [d.day, d]))
  const start = weekStartOf(addDays(to, -(CALENDAR_DAYS - 1)))
  const weeks: string[][] = []
  for (let ws = start; ws <= to; ws = addDays(ws, 7)) weeks.push(Array.from({ length: 7 }, (_, i) => addDays(ws, i)))
  const level = (d: DailyStat | undefined) => {
    if (!d) return 0
    const min = d.minutes + d.video_minutes
    if (min === 0) return d.questions > 0 || d.videos > 0 ? 1 : 0
    return min < 30 ? 1 : min < 60 ? 2 : min < 120 ? 3 : 4
  }
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto pb-1">
        <div className="flex gap-[3px]" role="grid" aria-label="Son 6 ay günlük çalışma takvimi">
          <div className="mr-1 grid grid-rows-7 gap-[3px] text-[10px] leading-3 text-zinc-400">
            {["Pzt", "", "Çar", "", "Cum", "", "Paz"].map((l, i) => (
              <span key={i} className="h-3">
                {l}
              </span>
            ))}
          </div>
          {weeks.map((w) => (
            <div key={w[0]} className="grid grid-rows-7 gap-[3px]" role="row">
              {w.map((day) => {
                if (day > to) return <span key={day} className="h-3 w-3" />
                const d = map.get(day)
                const min = d ? d.minutes + d.video_minutes : 0
                return (
                  <span
                    key={day}
                    role="gridcell"
                    title={`${fmtDay(day, true)}: ${d ? `${min} dk, ${d.questions} soru${d.videos ? `, ${d.videos} video` : ""}` : "çalışma yok"}`}
                    className={cn("h-3 w-3 rounded-[3px]", LEVELS[level(d)])}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1 text-[11px] text-zinc-500">
        Az
        {LEVELS.map((l) => (
          <span key={l} className={cn("h-3 w-3 rounded-[3px]", l)} />
        ))}
        Çok <span className="ml-2">(günlük çalışma + video dakikası)</span>
      </div>
    </div>
  )
}

export async function HabitsSection({ ctx }: { ctx: AnalizCtx }) {
  const loaded = await safeLoad("HabitsSection", async () => {
    const [daily, allSubjects] = await Promise.all([
      loadDaily(ctx.studentId, ctx.from, ctx.to, ctx.subjectId),
      loadSubjects(ctx.studentId, ctx.from, ctx.to),
    ])
    return { daily, allSubjects }
  })
  if (!loaded) return <SectionError title="Zaman ve alışkanlık" />
  const { daily, allSubjects } = loaded
  const inRange = daily.filter((d) => (ctx.from === null || d.day >= ctx.from) && d.day <= ctx.to)
  const activeDays = inRange.filter((d) => d.questions > 0 || d.minutes > 0 || d.videos > 0).length
  const trend = weekly(daily, ctx.from, ctx.to)

  const subjects = (ctx.subjectId ? allSubjects.filter((s) => s.subject_id === ctx.subjectId) : allSubjects).filter((s) => s.minutes > 0)
  const totalMin = subjects.reduce((s, x) => s + x.minutes, 0)
  const shares = subjects
    .map((s) => ({ ...s, share: totalMin ? Math.round((s.minutes / totalMin) * 100) : 0, acc: pct(s.correct, s.questions) }))
    .sort((a, b) => b.minutes - a.minutes)
  const weakest = shares.filter((s) => s.questions >= 30 && s.acc !== null).sort((a, b) => (a.acc ?? 0) - (b.acc ?? 0))[0]
  const imbalance = weakest && shares.length > 1 && weakest.share < 100 / shares.length ? weakest : null

  const dow = DOW.map((name) => ({ name: name.slice(0, 3), full: name, q: 0, c: 0 }))
  for (const d of inRange) {
    const w = dow[dowIndex(d.day)]
    w.q += d.questions
    w.c += d.correct
  }
  const best = [...dow].filter((d) => d.q >= 20).sort((a, b) => b.c / b.q - a.c / a.q)[0]

  return (
    <SectionCard id="zaman" title="Zaman ve alışkanlık" icon={<CalendarDays className="h-5 w-5 text-[#1B6B8A]" />}>
      <Card title="Aktivite takvimi (son 6 ay)">
        <ActivityCalendar daily={daily} to={ctx.to} />
      </Card>

      {activeDays < MIN_ACTIVE_DAYS ? (
        <Card>
          <NotEnough>Trend analizi için bu dönemde en az {MIN_ACTIVE_DAYS} gün veri gerekiyor (şu an {activeDays} gün).</NotEnough>
        </Card>
      ) : (
        <WeeklyMetricsChart data={trend} title="Haftalık trend" emptyText="Bu dönemde veri yok" />
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Ders bazlı zaman dağılımı">
          {shares.length === 0 ? (
            <NotEnough>Süre girilmiş soru kaydı yok. Kayıtlarına süre ekledikçe zaman dağılımın görünür.</NotEnough>
          ) : (
            <div className="space-y-3">
              <div className="flex h-4 overflow-hidden rounded-full" role="img" aria-label="Derslere ayrılan zaman payı">
                {shares.map((s) => (
                  <span key={s.subject_id} className="h-full border-r-2 border-white last:border-r-0" style={{ width: `${s.share}%`, backgroundColor: s.color ?? "#a1a1aa" }} title={`${s.subject_name}: %${s.share}`} />
                ))}
              </div>
              <ul className="space-y-1.5 text-sm">
                {shares.map((s) => (
                  <li key={s.subject_id} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-zinc-800">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color ?? "#a1a1aa" }} />
                      {s.subject_name}
                    </span>
                    <span className="tabular-nums text-zinc-600">
                      %{s.share} · {fmtMinutes(s.minutes)}
                      {s.acc !== null && <span className="ml-2 text-xs text-zinc-400">başarı %{s.acc}</span>}
                    </span>
                  </li>
                ))}
              </ul>
              {imbalance && (
                <p className="flex gap-2 rounded-xl bg-orange-50 px-3 py-2 text-sm text-[#9a3412]">
                  <Scale className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  {imbalance.subject_name} en düşük başarılı dersin (%{imbalance.acc}) ama zamanının yalnız %{imbalance.share}&apos;i bu derse gidiyor.
                </p>
              )}
            </div>
          )}
        </Card>
        <Card title="Gün bazlı dağılım">
          {activeDays < MIN_ACTIVE_DAYS ? (
            <NotEnough>Analiz için en az {MIN_ACTIVE_DAYS} gün veri gerekiyor.</NotEnough>
          ) : (
            <div className="space-y-2">
              <WeekdayChart data={dow.map((d) => ({ name: d.name, full: d.full, questions: d.q, success: d.q ? Math.round((d.c / d.q) * 100) : null }))} />
              <p className="text-xs text-zinc-500">
                {best ? `En verimli günün: ${best.full} (başarı %${Math.round((best.c / best.q) * 100)}).` : "Gün karşılaştırması için gün başına en az 20 soru gerekiyor."}{" "}
                Saat bazlı dağılım için kayıtlarda saat bilgisi tutulmuyor.
              </p>
            </div>
          )}
        </Card>
      </div>
    </SectionCard>
  )
}
