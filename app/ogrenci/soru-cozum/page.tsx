import Link from "next/link"
import { BarChart3, Clock, Hash, Library, NotebookPen, Plus, SearchX, Target } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/format"
import { istanbulDateStr } from "@/lib/tz"
import {
  accuracyBreakdown,
  accuracyPct,
  addDays,
  dailyStreak,
  groupByDay,
  weeklySummary,
  type SessionStat,
} from "@/lib/soru-cozum/summary"
import { parseSessionFilter, RANGE_OPTIONS } from "@/lib/soru-cozum/filters"
import { examKeyLabel, subjectExamKey } from "@/lib/soru-cozum/segment"
import { SummaryCards } from "@/components/soru-cozum/summary-cards"
import { AccuracyChart } from "@/components/soru-cozum/accuracy-chart"
import { SessionFilters } from "@/components/soru-cozum/session-filters"
import { SessionRowActions } from "@/components/soru-cozum/session-row-actions"
import { EditedBadge } from "@/components/shared/edited-badge"

export const metadata = { title: "Soru Çözüm — KoçUp" }

const LIST_LIMIT = 300
// Seri + haftalık özet + filtre seçenekleri için geriye bakış penceresi.
const STATS_LOOKBACK_DAYS = 400

export default async function SoruCozumPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user!.id
  const today = istanbulDateStr()
  const filter = parseSessionFilter(await searchParams, today)

  let listQ = supabase
    .from("study_sessions")
    .select(
      "id, date, created_at, updated_at, total_questions, correct, wrong, empty, duration_minutes, assignment_id, subject_id, topic_id, subjects(name, exam_type, grade, curriculum), topics(name), resources(name)",
    )
    .eq("student_id", userId)
    .lte("date", filter.to)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(LIST_LIMIT)
  if (filter.from) listQ = listQ.gte("date", filter.from)
  if (filter.subjectId) listQ = listQ.eq("subject_id", filter.subjectId)
  if (filter.topicId) listQ = listQ.eq("topic_id", filter.topicId)

  const [{ data: statsRaw }, { data: listRaw }] = await Promise.all([
    supabase
      .from("study_sessions")
      .select("date, subject_id, topic_id, total_questions, correct, subjects(name), topics(name)")
      .eq("student_id", userId)
      .gte("date", addDays(today, -STATS_LOOKBACK_DAYS))
      .lte("date", today),
    listQ,
  ])

  const stats: SessionStat[] = (statsRaw ?? []).map((r) => ({
    date: r.date,
    subject_id: r.subject_id,
    subject_name: r.subjects?.name ?? "—",
    topic_id: r.topic_id,
    topic_name: r.topics?.name ?? null,
    total_questions: r.total_questions,
    correct: r.correct,
  }))
  const list = listRaw ?? []

  // Kayıt başına yanlış defterine girilmiş satır sayısı (rozet + silme uyarısı).
  const listIds = list.filter((r) => r.wrong > 0).map((r) => r.id)
  const { data: wrongRows } = listIds.length
    ? await supabase.from("wrong_answers").select("study_session_id").in("study_session_id", listIds)
    : { data: [] as { study_session_id: string | null }[] }
  const recordedBySession = new Map<string, number>()
  for (const w of wrongRows ?? []) {
    if (w.study_session_id) recordedBySession.set(w.study_session_id, (recordedBySession.get(w.study_session_id) ?? 0) + 1)
  }

  const summary = weeklySummary(stats)
  const streak = dailyStreak(stats.map((s) => s.date), today)

  // Filtre seçenekleri: öğrencinin gerçekten kayıt girdiği ders/konular.
  const subjectOpts = new Map<string, string>()
  const topicOpts = new Map<string, { id: string; name: string; subject_id: string }>()
  for (const s of stats) {
    subjectOpts.set(s.subject_id, s.subject_name)
    if (s.topic_id && s.topic_name) topicOpts.set(s.topic_id, { id: s.topic_id, name: s.topic_name, subject_id: s.subject_id })
  }
  const filterSubjects = Array.from(subjectOpts, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, "tr"))
  const filterTopics = Array.from(topicOpts.values()).sort((a, b) => a.name.localeCompare(b.name, "tr"))

  const listStats: SessionStat[] = list.map((r) => ({
    date: r.date,
    subject_id: r.subject_id,
    subject_name: r.subjects?.name ?? "—",
    topic_id: r.topic_id,
    topic_name: r.topics?.name ?? null,
    total_questions: r.total_questions,
    correct: r.correct,
  }))
  const byTopic = filter.subjectId != null
  const chartRows = accuracyBreakdown(listStats, byTopic ? "topic" : "subject")
  const groups = groupByDay(list)
  const rangeLabel =
    filter.range === "ozel"
      ? `${filter.from ? formatDate(filter.from, "dd.MM.yyyy") : "Başlangıç"} – ${formatDate(filter.to, "dd.MM.yyyy")}`
      : RANGE_OPTIONS.find((o) => o.key === filter.range)?.label
  const chartTitle = byTopic
    ? `${subjectOpts.get(filter.subjectId!) ?? "Ders"} · konu bazlı doğruluk`
    : "Ders bazlı doğruluk"

  // Hiç kaydı olmayan öğrenciye filtre/grafik yerine karşılama ekranı.
  const neverRecorded =
    stats.length === 0 && list.length === 0 && filter.range !== "ozel" && !filter.subjectId && !filter.topicId

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Soru Çözüm</h1>
          <p className="text-sm text-zinc-500 mt-1">Haftalık özetin ve tüm kayıtların.</p>
        </div>
        <Button asChild variant="accent" className="shrink-0">
          <Link href="/ogrenci/soru-cozum/yeni">
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Yeni Kayıt</span><span className="sm:hidden">Ekle</span>
          </Link>
        </Button>
      </div>

      <SummaryCards summary={summary} streak={streak} />

      {neverRecorded ? (
        <div className="rounded-2xl border border-dashed border-orange-200 bg-gradient-to-b from-orange-50/60 to-white px-6 py-14 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100">
            <Hash className="h-7 w-7 text-[#F97316]" />
          </div>
          <h3 className="text-base font-semibold text-zinc-900">İlk soru çözüm kaydını ekle</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500">
            Konu konu kaydettikçe doğruluk oranın, en çok çalıştığın dersler ve günlük serin burada görünür.
          </p>
          <Button asChild variant="accent" className="mt-5">
            <Link href="/ogrenci/soru-cozum/yeni">
              <Plus className="h-4 w-4" /> Yeni Kayıt
            </Link>
          </Button>
        </div>
      ) : (
        <>
          <section className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold text-zinc-900">{chartTitle}</h2>
              <span className="text-xs text-zinc-400">{rangeLabel}</span>
            </div>
            {chartRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <BarChart3 className="mb-2 h-6 w-6 text-zinc-300" />
                <p className="text-sm text-zinc-500">Bu aralıkta grafik için kayıt yok.</p>
              </div>
            ) : (
              <AccuracyChart rows={chartRows} />
            )}
          </section>

          <section className="space-y-4">
            <SessionFilters
              range={filter.range}
              subjectId={filter.subjectId}
              topicId={filter.topicId}
              from={filter.rawFrom}
              to={filter.rawTo}
              today={today}
              subjects={filterSubjects}
              topics={filterTopics}
            />

            {groups.length === 0 ? (
              <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-12 text-center">
                <SearchX className="mx-auto mb-3 h-6 w-6 text-zinc-300" />
                <h3 className="text-sm font-semibold text-zinc-900">Bu filtreye uyan kayıt yok</h3>
                <p className="mt-1 text-sm text-zinc-500">Tarih aralığını genişletmeyi ya da filtreleri temizlemeyi dene.</p>
                <Button asChild variant="outline" size="sm" className="mt-4">
                  <Link href="/ogrenci/soru-cozum">Filtreleri temizle</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-5">
                {groups.map((g) => (
                  <div key={g.date}>
                    <div className="mb-2 flex items-baseline justify-between px-1">
                      <h3 className="text-sm font-semibold text-zinc-900">{dayLabel(g.date, today)}</h3>
                      <span className="text-xs tabular-nums text-zinc-500">
                        {g.total.toLocaleString("tr-TR")} soru · %{accuracyPct(g.correct, g.total) ?? 0}
                      </span>
                    </div>
                    <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
                      {g.items.map((s) => {
                        const subjectName = s.subjects?.name ?? "—"
                        const examLabel = s.subjects ? examKeyLabel(subjectExamKey(s.subjects)) : null
                        const acc = accuracyPct(s.correct, s.total_questions) ?? 0
                        return (
                          <li key={s.id} className="flex items-start gap-3 px-4 py-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <span className="truncate text-sm font-medium text-zinc-900">
                                  {subjectName}
                                  {s.topics?.name && <span className="text-zinc-500"> · {s.topics.name}</span>}
                                </span>
                                <EditedBadge updatedAt={s.updated_at} />
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                                {examLabel && <span className="font-medium text-zinc-400">{examLabel}</span>}
                                <span className="tabular-nums">
                                  <span className="text-emerald-600">{s.correct}D</span>{" "}
                                  <span className="text-red-600">{s.wrong}Y</span>{" "}
                                  <span>{s.empty}B</span>
                                </span>
                                {s.duration_minutes != null && (
                                  <span className="inline-flex items-center gap-1">
                                    <Clock className="h-3 w-3" /> {s.duration_minutes} dk
                                  </span>
                                )}
                                {s.resources?.name && (
                                  <span className="inline-flex min-w-0 items-center gap-1">
                                    <Library className="h-3 w-3 shrink-0" />
                                    <span className="truncate max-w-[10rem]">{s.resources.name}</span>
                                  </span>
                                )}
                                {s.assignment_id && (
                                  <span className="inline-flex items-center gap-1 text-[#1B6B8A]">
                                    <Target className="h-3 w-3" /> Koç ataması
                                  </span>
                                )}
                                {(recordedBySession.get(s.id) ?? 0) > 0 && (
                                  <span className="inline-flex items-center gap-1 text-orange-700">
                                    <NotebookPen className="h-3 w-3" /> {recordedBySession.get(s.id)}/{s.wrong} yanlış defterde
                                  </span>
                                )}
                              </div>
                              <ResultBar correct={s.correct} wrong={s.wrong} empty={s.empty} />
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold leading-none tabular-nums text-zinc-900">{s.total_questions}</div>
                              <div className="mt-1 text-[11px] tabular-nums text-zinc-500">%{acc}</div>
                            </div>
                            <SessionRowActions
                              sessionId={s.id}
                              wrong={s.wrong}
                              recordedWrongs={recordedBySession.get(s.id) ?? 0}
                              label={`${formatDate(s.date, "dd.MM.yyyy")} · ${subjectName}${s.topics?.name ? ` · ${s.topics.name}` : ""}`}
                            />
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))}
                {list.length >= LIST_LIMIT && (
                  <p className="text-center text-xs text-zinc-400">
                    En yeni {LIST_LIMIT} kayıt gösteriliyor. Daha eskiler için tarih aralığını daralt.
                  </p>
                )}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}

function dayLabel(date: string, today: string) {
  if (date === today) return "Bugün"
  if (date === addDays(today, -1)) return "Dün"
  return formatDate(date, "dd.MM.yyyy, EEEE")
}

// D/Y/B oranı — segmentler arasında 2px yüzey boşluğu.
function ResultBar({ correct, wrong, empty }: { correct: number; wrong: number; empty: number }) {
  const total = correct + wrong + empty
  if (total === 0) return null
  const parts = [
    { v: correct, c: "bg-emerald-500" },
    { v: wrong, c: "bg-red-500" },
    { v: empty, c: "bg-zinc-300" },
  ].filter((p) => p.v > 0)
  return (
    <div className="mt-2 flex h-1.5 w-full max-w-xs gap-0.5 overflow-hidden rounded-full" aria-hidden>
      {parts.map((p, i) => (
        // Oran veriye bağlı → Tailwind sınıfıyla ifade edilemez (kurumlar/hero-mockup deseni).
        <div key={i} className={`${p.c} h-full first:rounded-l-full last:rounded-r-full`} style={{ flexGrow: p.v }} />
      ))}
    </div>
  )
}
