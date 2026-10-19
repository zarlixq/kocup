import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"
import { fetchActiveTopics } from "@/lib/curriculum/active-topics"
import { todayDayOfWeek } from "@/lib/days"
import { mapProgramItem, PROGRAM_ITEM_COLUMNS, type RawProgramItem } from "@/lib/program/map-item"
import type { ProgramItem } from "@/components/program/weekly-program-board"
import { istanbulDateStr, istanbulWeekStartStr } from "@/lib/tz"
import { TREND_WEEKS } from "@/lib/upplan/config"
import {
  isMasteryConfidence,
  isMasteryLabel,
  isSelfAssessment,
  parseBreakdown,
  type MasteryBreakdown,
  type MasteryConfidence,
  type MasteryLabel,
  type SelfAssessment,
} from "@/lib/upplan/mastery"
import { scopeSubjects, toUpplanProfile, type UpplanProfile } from "@/lib/upplan/profile"
import {
  pickAlert,
  pickReviews,
  type LastExamSignal,
  type OverconfidentTopic,
  type ReviewSuggestion,
  type TodayAlert,
} from "@/lib/upplan/today"

type Client = SupabaseClient<Database>

// Okumalar RLS kapsamında: öğrenci kendini, koç kendi öğrencisini, kurum
// yöneticisi kendi kurumunu görür (RPC'ler SECURITY INVOKER, migration 209).

export async function loadUpplanProfile(supabase: Client, studentId: string): Promise<UpplanProfile | null> {
  const { data, error } = await supabase
    .from("student_upplan_profile")
    .select("status, grade, segment, alan, availability, focus_minutes, target_department, target_ranking, setup_step, completed_at")
    .eq("student_id", studentId)
    .maybeSingle()
  if (error) console.error("loadUpplanProfile", error)
  return data ? toUpplanProfile(data) : null
}

type SubjectRow = { id: string; name: string; exam_type: string | null; curriculum: string | null; order: number | null }

async function loadSubjects(supabase: Client): Promise<SubjectRow[]> {
  const { data } = await supabase.from("subjects").select("id, name, exam_type, curriculum, order").order("order")
  return data ?? []
}

// ─────────────────────────────────────────────────────────────────────────
// Konu taraması
// ─────────────────────────────────────────────────────────────────────────

export type ScanSubject = {
  id: string
  name: string
  topics: { id: string; name: string }[]
}

export type ScanData = {
  subjects: ScanSubject[]
  statuses: Record<string, SelfAssessment>
}

export async function loadScanData(supabase: Client, studentId: string, profile: UpplanProfile): Promise<ScanData> {
  const [subjects, topics, { data: rows }] = await Promise.all([
    loadSubjects(supabase),
    fetchActiveTopics(supabase),
    supabase.from("student_topic_self_assessment").select("topic_id, status").eq("student_id", studentId),
  ])
  const scoped = scopeSubjects(profile, subjects)
  const bySubject = new Map<string, { id: string; name: string }[]>()
  for (const t of topics) {
    const list = bySubject.get(t.subject_id) ?? []
    list.push({ id: t.id, name: t.name })
    bySubject.set(t.subject_id, list)
  }
  const statuses: Record<string, SelfAssessment> = {}
  for (const r of rows ?? []) if (isSelfAssessment(r.status)) statuses[r.topic_id] = r.status
  return {
    subjects: scoped
      .map((s) => ({ id: s.id, name: s.name, topics: bySubject.get(s.id) ?? [] }))
      .filter((s) => s.topics.length > 0),
    statuses,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Ustalık haritası
// ─────────────────────────────────────────────────────────────────────────

export type MasteryCell = {
  stored: number
  effective: number
  label: MasteryLabel
  confidence: MasteryConfidence
  evidence_n: number
  last_practiced_at: string | null
  forgetting: boolean
  breakdown: MasteryBreakdown
}

export type MasteryTopic = {
  id: string
  name: string
  assessment: SelfAssessment | null
  cell: MasteryCell | null
  /** Açık haritasında bu konuda yanlış yazılmış bilgi atomları. */
  gapAtoms: { id: string; name: string; wrongs: number }[]
}

export type MasterySubject = {
  id: string
  name: string
  average: number | null
  assessed: number
  topics: MasteryTopic[]
}

export type MasteryTrendPoint = { week_end: string; overall: number | null }

export type MasteryMapData = {
  profile: UpplanProfile | null
  subjects: MasterySubject[]
  overall: { average: number | null; assessed: number; total: number }
  trend: MasteryTrendPoint[]
}

const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 10) / 10 : null)

export async function loadMasteryMap(supabase: Client, studentId: string): Promise<MasteryMapData> {
  const [profile, subjects, { data: rows, error }, { data: trendRows }, { data: assess }, { data: gap }] = await Promise.all([
    loadUpplanProfile(supabase, studentId),
    loadSubjects(supabase),
    supabase.rpc("student_mastery_map", { p_student_id: studentId }),
    supabase.rpc("student_mastery_trend", { p_student_id: studentId, p_weeks: TREND_WEEKS }),
    supabase.from("student_topic_self_assessment").select("topic_id, status").eq("student_id", studentId),
    supabase.rpc("student_gap_map", { p_student_id: studentId }),
  ])
  if (error) console.error("student_mastery_map", error)

  const cells = new Map<string, MasteryCell>()
  for (const r of rows ?? []) {
    cells.set(r.topic_id, {
      stored: Number(r.stored),
      effective: Number(r.effective),
      label: isMasteryLabel(r.label) ? r.label : "zayif",
      confidence: isMasteryConfidence(r.confidence) ? r.confidence : "dusuk",
      evidence_n: r.evidence_n,
      last_practiced_at: r.last_practiced_at,
      forgetting: r.forgetting,
      breakdown: parseBreakdown(r.breakdown),
    })
  }
  const assessment = new Map<string, SelfAssessment>()
  for (const a of assess ?? []) if (isSelfAssessment(a.status)) assessment.set(a.topic_id, a.status)
  const gapByTopic = new Map<string, MasteryTopic["gapAtoms"]>()
  for (const g of gap ?? []) {
    if (g.wrong_count <= 0) continue
    const list = gapByTopic.get(g.topic_id) ?? []
    list.push({ id: g.atom_id, name: g.atom_name, wrongs: g.wrong_count })
    gapByTopic.set(g.topic_id, list)
  }

  // Kapsam: profilin dersleri + skoru olan (kapsam dışı da olsa) dersler.
  const cellSubjects = new Set((rows ?? []).map((r) => r.subject_id))
  const scoped = new Set((profile ? scopeSubjects(profile, subjects) : []).map((s) => s.id))
  const included = subjects.filter((s) => scoped.has(s.id) || cellSubjects.has(s.id))
  const scopeOrder = profile ? scopeSubjects(profile, subjects).map((s) => s.id) : []
  included.sort((a, b) => {
    const ia = scopeOrder.indexOf(a.id)
    const ib = scopeOrder.indexOf(b.id)
    return (ia < 0 ? 1e6 : ia) - (ib < 0 ? 1e6 : ib) || (a.order ?? 0) - (b.order ?? 0)
  })

  const topics = await fetchActiveTopics(supabase, { includeIds: Array.from(cells.keys()) })
  const topicsBySubject = new Map<string, { id: string; name: string }[]>()
  for (const t of topics) {
    // Pasif konu yalnız skoru varsa listelenir (includeIds).
    const list = topicsBySubject.get(t.subject_id) ?? []
    list.push({ id: t.id, name: t.name })
    topicsBySubject.set(t.subject_id, list)
  }

  const mapped: MasterySubject[] = included
    .map((s) => {
      const ts: MasteryTopic[] = (topicsBySubject.get(s.id) ?? []).map((t) => ({
        id: t.id,
        name: t.name,
        assessment: assessment.get(t.id) ?? null,
        cell: cells.get(t.id) ?? null,
        gapAtoms: (gapByTopic.get(t.id) ?? []).sort((a, b) => b.wrongs - a.wrongs),
      }))
      const scores = ts.flatMap((t) => (t.cell ? [t.cell.effective] : []))
      return { id: s.id, name: s.name, average: avg(scores), assessed: scores.length, topics: ts }
    })
    .filter((s) => s.topics.length > 0)

  const all = mapped.flatMap((s) => s.topics.flatMap((t) => (t.cell ? [t.cell.effective] : [])))

  const byWeek = new Map<string, { sum: number; n: number }>()
  for (const r of trendRows ?? []) {
    const w = byWeek.get(r.week_end) ?? { sum: 0, n: 0 }
    w.sum += Number(r.sum_effective)
    w.n += r.topic_count
    byWeek.set(r.week_end, w)
  }
  const trend = Array.from(byWeek.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([week_end, w]) => ({ week_end, overall: w.n ? Math.round((w.sum / w.n) * 10) / 10 : null }))

  return {
    profile,
    subjects: mapped,
    overall: { average: avg(all), assessed: all.length, total: mapped.reduce((n, s) => n + s.topics.length, 0) },
    trend,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Bugün ekranı
// ─────────────────────────────────────────────────────────────────────────

export type TodayData = {
  setupDone: boolean
  hasProfile: boolean
  today: string
  weekStart: string
  items: ProgramItem[]
  week: { done: number; total: number }
  reviews: ReviewSuggestion[]
  alert: TodayAlert | null
}

export async function loadOverconfident(supabase: Client, studentId: string): Promise<OverconfidentTopic[]> {
  const { data, error } = await supabase.rpc("student_overconfident_topics", { p_student_id: studentId })
  if (error) console.error("student_overconfident_topics", error)
  return (data ?? []).map((r) => ({ topic_id: r.topic_id, topic_name: r.topic_name, effective: Number(r.effective) }))
}

async function loadLastExamSignal(supabase: Client, studentId: string): Promise<LastExamSignal | null> {
  const { data: exam } = await supabase
    .from("exams")
    .select("id, name, exam_results(subject_id, wrong, subjects(name)), wrong_answers(topics(subject_id))")
    .eq("student_id", studentId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!exam) return null
  const distributed = new Map<string, number>()
  for (const w of exam.wrong_answers ?? []) {
    const sid = w.topics?.subject_id
    if (sid) distributed.set(sid, (distributed.get(sid) ?? 0) + 1)
  }
  return {
    exam_id: exam.id,
    exam_name: exam.name,
    subjects: (exam.exam_results ?? []).map((r) => ({
      subject_name: r.subjects?.name ?? "—",
      wrong: r.wrong,
      distributed: distributed.get(r.subject_id) ?? 0,
    })),
  }
}

export async function loadToday(supabase: Client, studentId: string, now: Date = new Date()): Promise<TodayData> {
  const today = istanbulDateStr(now)
  const weekStart = istanbulWeekStartStr(now)
  const dow = todayDayOfWeek(new Date(`${today}T12:00:00`))

  const [profile, { data: program }, { data: rows }, overconfident, lastExam] = await Promise.all([
    loadUpplanProfile(supabase, studentId),
    supabase
      .from("weekly_programs")
      .select(`id, weekly_program_items(${PROGRAM_ITEM_COLUMNS})`)
      .eq("student_id", studentId)
      .eq("week_start", weekStart)
      .maybeSingle(),
    supabase.rpc("student_mastery_map", { p_student_id: studentId }),
    loadOverconfident(supabase, studentId),
    loadLastExamSignal(supabase, studentId),
  ])

  const weekItems = ((program?.weekly_program_items ?? []) as RawProgramItem[]).map(mapProgramItem)
  const items = weekItems
    .filter((i) => i.day_of_week === dow)
    .sort((a, b) => (a.start_time ?? "99").localeCompare(b.start_time ?? "99"))

  const candidates = rows ?? []
  const names = new Map<string, string>()
  const ids = candidates.filter((r) => r.last_practiced_at).map((r) => r.topic_id)
  if (ids.length) {
    const { data: ts } = await supabase.from("topics").select("id, name").in("id", ids)
    for (const t of ts ?? []) names.set(t.id, t.name)
  }
  const reviews = pickReviews(
    candidates.map((r) => ({
      topic_id: r.topic_id,
      topic_name: names.get(r.topic_id) ?? "Konu",
      stored: Number(r.stored),
      effective: Number(r.effective),
      last_practiced_at: r.last_practiced_at,
    })),
    today,
  )

  return {
    setupDone: !!profile?.completed_at,
    hasProfile: !!profile,
    today,
    weekStart,
    items,
    week: { done: weekItems.filter((i) => i.is_completed).length, total: weekItems.length },
    reviews,
    alert: pickAlert(overconfident, lastExam),
  }
}
