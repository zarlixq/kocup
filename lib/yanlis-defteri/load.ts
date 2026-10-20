import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"
import { fetchActiveTopics, type ActiveTopic } from "@/lib/curriculum/active-topics"
import { groupSubjectNames } from "@/lib/curriculum/subject-groups"
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
import type { CatalogAtom } from "@/lib/yanlis-defteri/atom-search"

type Client = SupabaseClient<Database>

// ─────────────────────────────────────────────────────────────────────────
// Yanlış giriş paneli bağlamı
// ─────────────────────────────────────────────────────────────────────────

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
  /** Ders grubunun atom kataloğu (arama + konu chip'leri) ve öğrencinin atom geçmişi. */
  catalog: AtomCatalog
  rows: WrongRow[]
  /** Konuda çözülen toplam soru (güven metni için). */
  topicQuestions: number
}

export type AtomCatalog = {
  atoms: CatalogAtom[]
  /** Atom id → öğrencinin o atoma geçmişte yazdığı yanlış sayısı (hangi konudaki soruda olursa olsun). */
  history: Record<string, number>
}

/**
 * Ders grubunun (TYT/AYT aynı alan) tüm aktif konularındaki atomlar. Bir kez
 * yüklenir, arama istemcide yapılır. Konu sırası: grup listesindeki ders
 * sırası (TYT önce), sonra topics.order.
 */
export async function loadAtomCatalog(supabase: Client, studentId: string, subjectId: string): Promise<AtomCatalog> {
  const { data: subject } = await supabase.from("subjects").select("name").eq("id", subjectId).maybeSingle()
  const names = subject ? groupSubjectNames(subject.name) : []
  const { data: subjects } = names.length
    ? await supabase.from("subjects").select("id, name").in("name", names)
    : { data: [] as { id: string; name: string }[] }
  const subjectRank = new Map((subjects ?? []).map((s) => [s.id, names.indexOf(s.name)]))

  const [{ data: topics }, { data: history }] = await Promise.all([
    supabase
      .from("topics")
      .select("id, name, order, subject_id")
      .in("subject_id", Array.from(subjectRank.keys()))
      .eq("is_active", true),
    supabase.from("wrong_answers").select("knowledge_atom_id").eq("student_id", studentId).not("knowledge_atom_id", "is", null),
  ])
  const topicById = new Map((topics ?? []).map((t) => [t.id, t]))

  const { data: atoms, error } = topicById.size
    ? await supabase
        .from("knowledge_atoms")
        .select("id, name, type, description, sort_order, topic_id")
        .in("topic_id", Array.from(topicById.keys()))
        .order("sort_order")
        .range(0, 4999)
    : { data: [], error: null }
  if (error) console.error("loadAtomCatalog", error)

  const hist: Record<string, number> = {}
  for (const h of history ?? []) {
    if (h.knowledge_atom_id) hist[h.knowledge_atom_id] = (hist[h.knowledge_atom_id] ?? 0) + 1
  }

  return {
    atoms: (atoms ?? []).map((a) => {
      const t = topicById.get(a.topic_id)
      return {
        ...a,
        topic_name: t?.name ?? "—",
        topic_order: (subjectRank.get(t?.subject_id ?? "") ?? 0) * 10000 + (t?.order ?? 0),
      }
    }),
    history: hist,
  }
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

  const [catalog, { data: rows }, { data: topicSessions }, topicChoices] = await Promise.all([
    loadAtomCatalog(supabase, studentId, s.subject_id),
    supabase.from("wrong_answers").select("error_type, knowledge_atom_id").eq("study_session_id", s.id),
    s.topic_id
      ? supabase.from("study_sessions").select("total_questions").eq("student_id", studentId).eq("topic_id", s.topic_id)
      : Promise.resolve({ data: [] as { total_questions: number }[] }),
    s.topic_id ? Promise.resolve([] as ActiveTopic[]) : fetchActiveTopics(supabase, { subjectId: s.subject_id }),
  ])

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
    catalog,
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
  /** Bu atoma BAŞKA konulardaki sorulardan gelen yanlışlar (atom kendi konusunda listelenir). */
  crossSources: { topic_id: string; topic_name: string; count: number }[]
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
  const [{ data: gap, error: gapErr }, { data: cross }, { data: dist }, { data: trend }] = await Promise.all([
    supabase.rpc("student_gap_map", { p_student_id: studentId }),
    supabase.rpc("student_gap_cross_sources", { p_student_id: studentId }),
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

  const crossByAtom = new Map<string, GapAtom["crossSources"]>()
  for (const c of cross ?? []) {
    const list = crossByAtom.get(c.atom_id) ?? []
    list.push({ topic_id: c.source_topic_id, topic_name: c.source_topic_name, count: c.cnt })
    crossByAtom.set(c.atom_id, list)
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
    crossSources: (crossByAtom.get(r.atom_id) ?? []).sort((a, b) => b.count - a.count),
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
    subject_id: string
    subject_name: string
    atom_id: string | null
    atom_name: string | null
    /** Atom başka bir konudansa o konunun adı (aynı konudaysa null). */
    atom_topic_name: string | null
  }[]
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
        "id, error_type, note, created_at, topic_id, knowledge_atom_id, knowledge_atoms(name, topic_id, topics(name)), topics(name, subject_id, subjects(name)), study_sessions(date), exams(name, date)",
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
      subject_id: r.topics?.subject_id ?? "",
      subject_name: r.topics?.subjects?.name ?? "—",
      atom_id: r.knowledge_atom_id,
      atom_name: r.knowledge_atoms?.name ?? null,
      atom_topic_name:
        r.knowledge_atoms && r.knowledge_atoms.topic_id !== r.topic_id ? (r.knowledge_atoms.topics?.name ?? null) : null,
    }))

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

  return { items, pendingSessions }
}
