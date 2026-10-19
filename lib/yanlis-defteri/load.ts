import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"
import { fetchActiveTopics, type ActiveTopic } from "@/lib/curriculum/active-topics"
import { addDays } from "@/lib/soru-cozum/summary"
import { istanbulWeekStartStr } from "@/lib/tz"
import {
  ERROR_TYPES,
  isConfidence,
  isErrorType,
  type Confidence,
  type ErrorType,
} from "@/lib/yanlis-defteri/constants"
import type { WrongRow } from "@/lib/yanlis-defteri/panel-logic"

type Client = SupabaseClient<Database>

// ─────────────────────────────────────────────────────────────────────────
// Yanlış giriş paneli bağlamı
// ─────────────────────────────────────────────────────────────────────────

export type AtomOption = {
  id: string
  name: string
  type: string
  sort_order: number
  description: string | null
}

export type SessionWrongContext = {
  session: {
    id: string
    date: string
    wrong: number
    subject_id: string
    subject_name: string
    topic_id: string | null
    topic_name: string | null
  }
  /** Konusuz eski kayıt → panel önce konu seçtirir (dersin aktif konuları). */
  topicChoices: ActiveTopic[]
  atoms: AtomOption[]
  /** Atom id → öğrencinin bu konuda o atoma geçmişte yazdığı yanlış sayısı. */
  history: Record<string, number>
  rows: WrongRow[]
  /** Konuda çözülen toplam soru (güven metni için). */
  topicQuestions: number
}

export async function loadAtomsForTopic(supabase: Client, topicId: string): Promise<AtomOption[]> {
  const { data } = await supabase
    .from("knowledge_atoms")
    .select("id, name, type, sort_order, description")
    .eq("topic_id", topicId)
    .order("sort_order")
  return data ?? []
}

export async function loadSessionWrongContext(
  supabase: Client,
  studentId: string,
  sessionId: string,
): Promise<SessionWrongContext | null> {
  const { data: s } = await supabase
    .from("study_sessions")
    .select("id, date, wrong, subject_id, topic_id, subjects(name), topics(name)")
    .eq("id", sessionId)
    .eq("student_id", studentId)
    .maybeSingle()
  if (!s) return null

  const [atoms, { data: rows }, { data: history }, { data: topicSessions }, topicChoices] = await Promise.all([
    s.topic_id ? loadAtomsForTopic(supabase, s.topic_id) : Promise.resolve([] as AtomOption[]),
    supabase.from("wrong_answers").select("error_type, knowledge_atom_id").eq("study_session_id", s.id),
    s.topic_id
      ? supabase
          .from("wrong_answers")
          .select("knowledge_atom_id")
          .eq("student_id", studentId)
          .eq("topic_id", s.topic_id)
          .not("knowledge_atom_id", "is", null)
      : Promise.resolve({ data: [] as { knowledge_atom_id: string | null }[] }),
    s.topic_id
      ? supabase.from("study_sessions").select("total_questions").eq("student_id", studentId).eq("topic_id", s.topic_id)
      : Promise.resolve({ data: [] as { total_questions: number }[] }),
    s.topic_id ? Promise.resolve([] as ActiveTopic[]) : fetchActiveTopics(supabase, { subjectId: s.subject_id }),
  ])

  const hist: Record<string, number> = {}
  for (const h of history ?? []) {
    if (h.knowledge_atom_id) hist[h.knowledge_atom_id] = (hist[h.knowledge_atom_id] ?? 0) + 1
  }

  return {
    session: {
      id: s.id,
      date: s.date,
      wrong: s.wrong,
      subject_id: s.subject_id,
      subject_name: s.subjects?.name ?? "—",
      topic_id: s.topic_id,
      topic_name: s.topics?.name ?? null,
    },
    topicChoices,
    atoms,
    history: hist,
    rows: (rows ?? [])
      .filter((r) => isErrorType(r.error_type))
      .map((r) => ({ error_type: r.error_type as ErrorType, knowledge_atom_id: r.knowledge_atom_id })),
    topicQuestions: (topicSessions ?? []).reduce((sum, r) => sum + r.total_questions, 0),
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Açık haritası (hesap SQL'de: student_gap_map / _error_distribution / _gap_trend)
// ─────────────────────────────────────────────────────────────────────────

export type GapAtom = {
  atom_id: string
  atom_name: string
  atom_type: string
  atom_sort: number
  topic_id: string
  topic_name: string
  subject_id: string
  subject_name: string
  wrong_count: number
  topic_questions: number
  subject_wrong_rate: number
  atoms_in_topic: number
  score: number
  confidence: Confidence
  prerequisites: { id: string; name: string }[]
}

export type ErrorDistRow = {
  subject_id: string
  subject_name: string
  topic_id: string
  topic_name: string
  error_type: ErrorType
  cnt: number
}

export type TrendWeek = { week_start: string } & Record<ErrorType, number>

export type GapMapData = {
  atoms: GapAtom[]
  /** En büyük açıklar: en az 1 atom-yanlışı olan, güveni yeterli olanlar önce. */
  top: GapAtom[]
  distribution: ErrorDistRow[]
  trend: TrendWeek[]
  totalWrongs: number
  attributedWrongs: number
}

const TREND_WEEKS = 4
const TOP_GAPS = 5

export async function loadGapMap(supabase: Client, studentId: string): Promise<GapMapData> {
  const [{ data: gap, error: gapErr }, { data: dist }, { data: trend }] = await Promise.all([
    supabase.rpc("student_gap_map", { p_student_id: studentId }),
    supabase.rpc("student_error_distribution", { p_student_id: studentId }),
    supabase.rpc("student_gap_trend", { p_student_id: studentId, p_weeks: TREND_WEEKS }),
  ])
  if (gapErr) console.error("student_gap_map", gapErr)

  const rows = gap ?? []
  const nameById = new Map(rows.map((r) => [r.atom_id, r.atom_name]))
  // Ön koşul atomu başka (çalışılmamış) bir konudaysa adını ayrıca çek.
  const missingPrereq = Array.from(
    new Set(rows.flatMap((r) => r.prerequisite_ids ?? []).filter((id) => !nameById.has(id))),
  )
  if (missingPrereq.length > 0) {
    const { data } = await supabase.from("knowledge_atoms").select("id, name").in("id", missingPrereq)
    for (const a of data ?? []) nameById.set(a.id, a.name)
  }

  const atoms: GapAtom[] = rows.map((r) => ({
    atom_id: r.atom_id,
    atom_name: r.atom_name,
    atom_type: r.atom_type,
    atom_sort: r.atom_sort,
    topic_id: r.topic_id,
    topic_name: r.topic_name,
    subject_id: r.subject_id,
    subject_name: r.subject_name,
    wrong_count: r.wrong_count,
    topic_questions: r.topic_questions,
    subject_wrong_rate: Number(r.subject_wrong_rate),
    atoms_in_topic: r.atoms_in_topic,
    score: Number(r.score),
    confidence: isConfidence(r.confidence) ? r.confidence : "yetersiz",
    prerequisites: (r.prerequisite_ids ?? []).map((id) => ({ id, name: nameById.get(id) ?? "—" })),
  }))

  const top = atoms
    .filter((a) => a.wrong_count > 0)
    .sort((a, b) => Number(a.confidence === "yetersiz") - Number(b.confidence === "yetersiz") || b.score - a.score)
    .slice(0, TOP_GAPS)

  const distribution: ErrorDistRow[] = (dist ?? [])
    .filter((d) => isErrorType(d.error_type))
    .map((d) => ({ ...d, error_type: d.error_type as ErrorType }))

  // Trend: eksik haftaları sıfırla doldur (Istanbul haftası, eskiden yeniye).
  const thisWeek = istanbulWeekStartStr()
  const weeks: TrendWeek[] = Array.from({ length: TREND_WEEKS }, (_, i) => {
    const ws = addDays(thisWeek, -7 * (TREND_WEEKS - 1 - i))
    const w = { week_start: ws } as TrendWeek
    for (const t of ERROR_TYPES) w[t] = 0
    return w
  })
  for (const t of trend ?? []) {
    const w = weeks.find((x) => x.week_start === t.week_start)
    if (w && isErrorType(t.error_type)) w[t.error_type] += t.cnt
  }

  const totalWrongs = distribution.reduce((s, d) => s + d.cnt, 0)
  const attributedWrongs = atoms.reduce((s, a) => s + a.wrong_count, 0)

  return { atoms, top, distribution, trend: weeks, totalWrongs, attributedWrongs }
}

// ─────────────────────────────────────────────────────────────────────────
// Yanlış defteri — kayıt listesi + "deftere girilmemiş yanlışlar"
// ─────────────────────────────────────────────────────────────────────────

export type WrongListData = {
  items: {
    id: string
    date: string
    error_type: ErrorType | null
    /** Deneme kaynaklı yanlışta deneme adı. */
    exam_name: string | null
    note: string | null
    topic_id: string
    topic_name: string
    subject_name: string
    atom_id: string | null
    atom_name: string | null
  }[]
  atomsByTopic: Record<string, { id: string; name: string }[]>
  /** Yanlışı olup deftere tamamen girilmemiş son soru kayıtları. */
  pendingSessions: { id: string; date: string; label: string; wrong: number; recorded: number }[]
}

const LIST_LIMIT = 300
const PENDING_LOOKBACK_DAYS = 30

export async function loadWrongList(supabase: Client, studentId: string): Promise<WrongListData> {
  const since = addDays(istanbulWeekStartStr(), -PENDING_LOOKBACK_DAYS)
  const [{ data: rows }, { data: sessions }] = await Promise.all([
    supabase
      .from("wrong_answers")
      .select(
        "id, error_type, note, created_at, topic_id, knowledge_atom_id, knowledge_atoms(name), topics(name, subjects(name)), study_sessions(date), exams(name, date)",
      )
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(LIST_LIMIT),
    supabase
      .from("study_sessions")
      .select("id, date, wrong, subjects(name), topics(name), wrong_answers(count)")
      .eq("student_id", studentId)
      .gt("wrong", 0)
      .gte("date", since)
      .order("date", { ascending: false })
      .limit(60),
  ])

  const items = (rows ?? [])
    .filter((r) => r.error_type === null || isErrorType(r.error_type))
    .map((r) => ({
      id: r.id,
      date: r.study_sessions?.date ?? r.exams?.date ?? r.created_at.slice(0, 10),
      error_type: isErrorType(r.error_type) ? r.error_type : null,
      exam_name: r.exams?.name ?? null,
      note: r.note,
      topic_id: r.topic_id,
      topic_name: r.topics?.name ?? "—",
      subject_name: r.topics?.subjects?.name ?? "—",
      atom_id: r.knowledge_atom_id,
      atom_name: r.knowledge_atoms?.name ?? null,
    }))

  const topicIds = Array.from(new Set(items.map((i) => i.topic_id)))
  const { data: atoms } = topicIds.length
    ? await supabase.from("knowledge_atoms").select("id, name, topic_id").in("topic_id", topicIds).order("sort_order")
    : { data: [] as { id: string; name: string; topic_id: string }[] }
  const atomsByTopic: Record<string, { id: string; name: string }[]> = {}
  for (const a of atoms ?? []) (atomsByTopic[a.topic_id] ??= []).push({ id: a.id, name: a.name })

  const pendingSessions = (sessions ?? [])
    .map((s) => {
      const recorded = Array.isArray(s.wrong_answers) ? (s.wrong_answers[0]?.count ?? 0) : 0
      return {
        id: s.id,
        date: s.date,
        label: [s.subjects?.name, s.topics?.name].filter(Boolean).join(" · "),
        wrong: s.wrong,
        recorded,
      }
    })
    .filter((s) => s.recorded < s.wrong)
    .slice(0, 8)

  return { items, atomsByTopic, pendingSessions }
}
