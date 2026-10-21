import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/lib/database.types"
import { complianceUptoDay, dailyCompliance, type DayCount } from "@/lib/analytics/daily-compliance"
import { istanbulDateStr, istanbulWeekStartStr } from "@/lib/tz"
import { addWeeks } from "@/lib/week"
import { loadPlaylists } from "@/lib/resources/videos"
import { playlistProgressRows, type PlaylistProgressRow } from "@/lib/resources/video-summary"
import { buildResourceComparisonData } from "@/lib/charts/builders"
import type { SubjectComparisonDatum } from "@/components/charts/subject-comparison-bar"
import { ALL_TIME_START, addDays } from "@/lib/analytics/analiz/filter"

// Analizim veri katmanı — YALNIZ SUNUCU. Ağır toplama SQL'de (migration 222,
// SECURITY INVOKER → RLS: öğrenci kendisi, koç kendi öğrencisi). React cache()
// aynı istek içinde bölümlerin aynı veriyi tekrar çekmesini önler.
// Hata fırlatır; her bölüm kendi hatasını yakalar (bir bölüm diğerini kırmaz).

type Fn = Database["public"]["Functions"]
export type SubjectStat = Fn["analiz_subjects"]["Returns"][number]
export type TopicStat = Fn["analiz_topics"]["Returns"][number]
export type DailyStat = Fn["analiz_daily"]["Returns"][number]

export type PeriodStats = {
  questions: number
  correct: number
  wrong: number
  empty: number
  minutes: number
  videos: number
  video_seconds: number
  active_days: number
}

export type Overview = {
  cur: PeriodStats
  prev: PeriodStats | null
  streak: number
  topics_done: number
  topics_total: number
}

export type WrongStats = {
  total: number
  unrepeated: number
  by_subject: { subject_id: string; name: string; n: number }[]
  by_topic: { topic_id: string; name: string; subject_name: string; n: number }[]
  by_error_type: { type: string; n: number }[]
  by_atom_type: { type: string; n: number }[]
  top_atoms: { name: string; type: string; n: number }[]
}

export type ExamRow = {
  id: string
  name: string
  date: string
  exam_type: string
  net: number
  subjects: { subject_id: string; name: string; color: string | null; net: number }[]
}

export type ComplianceWeekStat = { weekStart: string; total: number; done: number; percent: number | null }

export type ProgramStats = {
  weeks: ComplianceWeekStat[]
  roadmap: { done: number; active: number; waiting: number; source: "upplan" | "hedefler" } | null
}

export type ResourceStats = { books: SubjectComparisonDatum[]; playlists: PlaylistProgressRow[] }

function emptyPeriod(): PeriodStats {
  return { questions: 0, correct: 0, wrong: 0, empty: 0, minutes: 0, videos: 0, video_seconds: 0, active_days: 0 }
}

function asPeriod(v: unknown): PeriodStats | null {
  if (!v || typeof v !== "object") return null
  const r = v as Record<string, unknown>
  const p = emptyPeriod()
  for (const k of Object.keys(p) as (keyof PeriodStats)[]) p[k] = Number(r[k] ?? 0) || 0
  return p
}

export const loadOverview = cache(async (studentId: string, from: string | null, to: string, subjectId: string | null): Promise<Overview> => {
  const db = await createClient()
  const { data, error } = await db.rpc("analiz_overview", { p_student: studentId, p_from: from, p_to: to, p_subject: subjectId ?? undefined })
  if (error) throw error
  const r = (data ?? {}) as Record<string, unknown>
  return {
    cur: asPeriod(r.cur) ?? emptyPeriod(),
    prev: asPeriod(r.prev),
    streak: Number(r.streak ?? 0),
    topics_done: Number(r.topics_done ?? 0),
    topics_total: Number(r.topics_total ?? 0),
  }
})

export const loadSubjects = cache(async (studentId: string, from: string | null, to: string): Promise<SubjectStat[]> => {
  const db = await createClient()
  const { data, error } = await db.rpc("analiz_subjects", { p_student: studentId, p_from: from, p_to: to })
  if (error) throw error
  return (data ?? []).sort((a, b) => (a.exam_type ?? "").localeCompare(b.exam_type ?? "") || a.sort_order - b.sort_order)
})

export const loadTopics = cache(
  async (studentId: string, from: string | null, to: string, subjectId: string | null, split: string): Promise<TopicStat[]> => {
    const db = await createClient()
    const { data, error } = await db.rpc("analiz_topics", {
      p_student: studentId,
      p_from: from,
      p_to: to,
      p_subject: subjectId ?? undefined,
      p_split: split,
    })
    if (error) throw error
    return (data ?? []).sort((a, b) => a.sort_order - b.sort_order)
  },
)

/** Takvim için en az son 26 hafta; dönem daha uzunsa dönemin tamamı. */
export const CALENDAR_DAYS = 182

export const loadDaily = cache(async (studentId: string, from: string | null, to: string, subjectId: string | null): Promise<DailyStat[]> => {
  const db = await createClient()
  const calendarFrom = addDays(to, -(CALENDAR_DAYS - 1))
  const start = from === null ? ALL_TIME_START : from < calendarFrom ? from : calendarFrom
  const { data, error } = await db.rpc("analiz_daily", { p_student: studentId, p_from: start, p_to: to, p_subject: subjectId ?? undefined })
  if (error) throw error
  return data ?? []
})

export const loadWrongStats = cache(async (studentId: string, from: string | null, to: string, subjectId: string | null): Promise<WrongStats> => {
  const db = await createClient()
  const { data, error } = await db.rpc("analiz_wrong_answers", { p_student: studentId, p_from: from, p_to: to, p_subject: subjectId ?? undefined })
  if (error) throw error
  const r = (data ?? {}) as Partial<WrongStats>
  return {
    total: Number(r.total ?? 0),
    unrepeated: Number(r.unrepeated ?? 0),
    by_subject: r.by_subject ?? [],
    by_topic: r.by_topic ?? [],
    by_error_type: r.by_error_type ?? [],
    by_atom_type: r.by_atom_type ?? [],
    top_atoms: r.top_atoms ?? [],
  }
})

export const loadExams = cache(async (studentId: string, from: string | null, to: string, subjectId: string | null): Promise<ExamRow[]> => {
  const db = await createClient()
  let q = db
    .from("exams")
    .select("id, name, date, exam_type, exam_results(net, subject_id, subjects(name, order, color))")
    .eq("student_id", studentId)
    .lte("date", to)
    .order("date", { ascending: true })
  if (from) q = q.gte("date", from)
  const { data, error } = await q
  if (error) throw error
  const out: ExamRow[] = []
  for (const e of data ?? []) {
    const subjects = (e.exam_results ?? [])
      .filter((r) => !subjectId || r.subject_id === subjectId)
      .sort((a, b) => (a.subjects?.order ?? 0) - (b.subjects?.order ?? 0))
      .map((r) => ({ subject_id: r.subject_id, name: r.subjects?.name ?? "—", color: r.subjects?.color ?? null, net: Math.round(Number(r.net ?? 0) * 100) / 100 }))
    if (subjects.length === 0) continue
    out.push({
      id: e.id,
      name: e.name,
      date: e.date,
      exam_type: e.exam_type,
      net: Math.round(subjects.reduce((s, x) => s + x.net, 0) * 100) / 100,
      subjects,
    })
  }
  return out
})

/** Son `weeks` haftanın uyumu (lib/analytics/daily-compliance ile — tek formül) + yol haritası. */
export const loadProgramStats = cache(async (studentId: string, weeks: number): Promise<ProgramStats> => {
  const db = await createClient()
  const current = istanbulWeekStartStr()
  const first = addWeeks(current, -(weeks - 1))
  const [{ data: programs, error: pe }, { data: goals, error: ge }] = await Promise.all([
    db
      .from("weekly_programs")
      .select("week_start, weekly_program_items(day_of_week, is_completed)")
      .eq("student_id", studentId)
      .gte("week_start", first)
      .lte("week_start", current),
    db.from("topic_assignments").select("status, origin").eq("student_id", studentId).neq("status", "iptal"),
  ])
  if (pe) throw pe
  if (ge) throw ge
  const today = istanbulDateStr()
  const byWeek = new Map<string, DayCount[]>()
  for (const p of programs ?? []) {
    const days = new Map<number, DayCount>()
    for (const it of p.weekly_program_items ?? []) {
      const d = days.get(it.day_of_week) ?? { day_of_week: it.day_of_week, total: 0, done: 0 }
      d.total += 1
      if (it.is_completed) d.done += 1
      days.set(it.day_of_week, d)
    }
    byWeek.set(p.week_start, [...(byWeek.get(p.week_start) ?? []), ...days.values()])
  }
  const list: ComplianceWeekStat[] = []
  for (let i = 0; i < weeks; i++) {
    const ws = addWeeks(first, i)
    const days = byWeek.get(ws)
    if (!days) {
      list.push({ weekStart: ws, total: 0, done: 0, percent: null })
      continue
    }
    const c = dailyCompliance(days, complianceUptoDay(ws, today))
    list.push({ weekStart: ws, total: c.totalItems, done: c.doneItems, percent: c.percent })
  }

  const all = goals ?? []
  const upplan = all.filter((g) => g.origin === "upplan")
  const src = upplan.length ? upplan : all
  const roadmap = src.length
    ? {
        done: src.filter((g) => g.status === "tamamlandi").length,
        active: src.filter((g) => g.status === "aktif").length,
        waiting: src.filter((g) => g.status === "sirada" || g.status === "zaman_kalirsa").length,
        source: (upplan.length ? "upplan" : "hedefler") as "upplan" | "hedefler",
      }
    : null
  return { weeks: list, roadmap }
})

export const loadResourceStats = cache(async (studentId: string): Promise<ResourceStats> => {
  const db = await createClient()
  const [books, playlists] = await Promise.all([buildResourceComparisonData(db, studentId), loadPlaylists(db, studentId)])
  return { books, playlists: playlistProgressRows(playlists) }
})

/** Hangi modüllerde veri var (yoksa bölüm gizlenir). */
export const loadModulePresence = cache(async (studentId: string) => {
  const db = await createClient()
  const head = { count: "exact" as const, head: true }
  const [exams, wrongs, programs, goals, videos] = await Promise.all([
    db.from("exams").select("id", head).eq("student_id", studentId),
    db.from("wrong_answers").select("id", head).eq("student_id", studentId),
    db.from("weekly_programs").select("id", head).eq("student_id", studentId),
    db.from("topic_assignments").select("id", head).eq("student_id", studentId),
    db.from("student_resource_videos").select("id", head).eq("student_id", studentId),
  ])
  return {
    exams: (exams.count ?? 0) > 0,
    wrongs: (wrongs.count ?? 0) > 0,
    program: (programs.count ?? 0) > 0 || (goals.count ?? 0) > 0,
    videos: (videos.count ?? 0) > 0,
  }
})
