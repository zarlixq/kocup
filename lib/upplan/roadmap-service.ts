import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database, Json } from "@/lib/database.types"
import { fetchActiveTopics } from "@/lib/curriculum/active-topics"
import { loadAssignmentsWithProgress } from "@/lib/assignments/load"
import { istanbulDateStr } from "@/lib/tz"
import {
  BIG_SHIFT_DAYS,
  DEFAULT_SUBJECT_EXAM_QUESTIONS,
  EXAM_DATES,
  GAP_CONFIDENT_LEVELS,
  GOAL_TEMPLATES,
  NET_GAP_EXAMS,
  NO_DATA_MASTERY,
  SUBJECT_EXAM_QUESTIONS,
  BLOCK_TYPES,
  type BlockType,
} from "@/lib/upplan/config"
import { isSelfAssessment, parseBreakdown } from "@/lib/upplan/mastery"
import { loadUpplanProfile } from "@/lib/upplan/load"
import { scopeSubjects, type UpplanProfile } from "@/lib/upplan/profile"
import {
  addDaysIso,
  blockTypeFor,
  buildRoadmap,
  chunkWaves,
  daysBetweenIso,
  isGoalComplete,
  minutesPerQuestion,
  needMinutes,
  netGapFactor,
  paceStatus,
  scheduleWaves,
  topicEdgesFromAtoms,
  weeklyCapacityMinutes,
  type Edge,
  type ExistingGoal,
  type Roadmap,
  type RoadmapTopicInput,
} from "@/lib/upplan/roadmap"

type Client = SupabaseClient<Database>

// Yol haritası sunucu servisi. Okuma çağıranın client'ıyla (RLS) ya da service
// role ile yapılabilir; YAZMALAR service role ile ve yalnız doğrulanmış öğrenci
// için yapılır (çağıran action/cron doğrular).

export type RoadmapPayload = Roadmap & { edges: Edge[]; segment: "yks" | "lgs" }

export function isBlockType(v: unknown): v is BlockType {
  return typeof v === "string" && (BLOCK_TYPES as readonly string[]).includes(v)
}

function isPayload(v: unknown): v is RoadmapPayload {
  return !!v && typeof v === "object" && Array.isArray((v as { items?: unknown }).items)
}

export function parsePayload(v: Json | null | undefined): RoadmapPayload | null {
  return isPayload(v) ? v : null
}

export function availableMinutes(profile: UpplanProfile): number {
  return Object.values(profile.availability).reduce((n, s) => n + s.length, 0) * 30
}

export function weeksUntil(today: string, examDate: string): number {
  return Math.max(Math.floor(daysBetweenIso(today, examDate) / 7), 0)
}

// ─────────────────────────────────────────────────────────────────────────
// Girdi toplama
// ─────────────────────────────────────────────────────────────────────────

export async function loadMinutesPerQuestion(db: Client, studentId: string): Promise<number> {
  const { data } = await db
    .from("study_sessions")
    .select("total_questions, duration_minutes")
    .eq("student_id", studentId)
    .not("duration_minutes", "is", null)
    .order("date", { ascending: false })
    .limit(200)
  return minutesPerQuestion(data ?? [])
}

export async function loadTopicEdges(db: Client): Promise<Edge[]> {
  const [{ data: prereqs }, { data: atoms }] = await Promise.all([
    db.from("knowledge_atom_prerequisites").select("atom_id, prerequisite_atom_id"),
    db.from("knowledge_atoms").select("id, topic_id"),
  ])
  const topicOfAtom = new Map((atoms ?? []).map((a) => [a.id, a.topic_id]))
  return topicEdgesFromAtoms(prereqs ?? [], topicOfAtom)
}

type MasteryInfo = { effective: number; stored: number; forgetting: boolean; examWrongs: number; last: string | null }

export async function loadMasteryInfo(db: Client, studentId: string): Promise<Map<string, MasteryInfo>> {
  const { data } = await db.rpc("student_mastery_map", { p_student_id: studentId })
  const out = new Map<string, MasteryInfo>()
  for (const r of data ?? []) {
    out.set(r.topic_id, {
      effective: Number(r.effective),
      stored: Number(r.stored),
      forgetting: r.forgetting,
      examWrongs: parseBreakdown(r.breakdown).examWrongs,
      last: r.last_practiced_at,
    })
  }
  return out
}

export type RoadmapContext = {
  profile: UpplanProfile
  coachId: string | null
  today: string
  examDate: string
  input: Parameters<typeof buildRoadmap>[0]
}

export async function gatherRoadmapContext(
  db: Client,
  studentId: string,
  today = istanbulDateStr(),
  /** Önizleme/kuru çalıştırma: kayıtlı profil yerine bunu kullan (yazma yok). */
  profileOverride?: UpplanProfile,
): Promise<RoadmapContext | null> {
  const profile = profileOverride ?? (await loadUpplanProfile(db, studentId))
  if (!profile) return null
  const examDate = EXAM_DATES[profile.segment].date

  const [{ data: student }, { data: subjects }, topics, mastery, { data: assess }, { data: gap }, { data: exams }, edges, mpq, goals] =
    await Promise.all([
      db.from("students").select("coach_id").eq("id", studentId).maybeSingle(),
      db.from("subjects").select("id, name, exam_type, curriculum, order").order("order"),
      fetchActiveTopics(db),
      loadMasteryInfo(db, studentId),
      db.from("student_topic_self_assessment").select("topic_id, status").eq("student_id", studentId),
      db.rpc("student_gap_map", { p_student_id: studentId }),
      db
        .from("exams")
        .select("id, date, exam_results(subject_id, correct, wrong, empty)")
        .eq("student_id", studentId)
        .order("date", { ascending: false })
        .limit(NET_GAP_EXAMS),
      loadTopicEdges(db),
      loadMinutesPerQuestion(db, studentId),
      loadAssignmentsWithProgress(db, { studentId }),
    ])

  const scoped = scopeSubjects(profile, subjects ?? [])
  const scopedIds = new Set(scoped.map((s) => s.id))
  const subjectById = new Map(scoped.map((s) => [s.id, s]))
  const scopeTopics = topics.filter((t) => scopedIds.has(t.subject_id))
  const topicCountBySubject = new Map<string, number>()
  for (const t of scopeTopics) topicCountBySubject.set(t.subject_id, (topicCountBySubject.get(t.subject_id) ?? 0) + 1)

  const ids = scopeTopics.map((t) => t.id)
  const weights = new Map<string, number>()
  for (let i = 0; i < ids.length; i += 300) {
    const { data } = await db.from("topic_exam_weights").select("topic_id, exam, avg_questions").in("topic_id", ids.slice(i, i + 300))
    for (const w of data ?? []) {
      const subj = subjectById.get(topics.find((t) => t.id === w.topic_id)?.subject_id ?? "")
      if (!subj || (subj.exam_type ?? "") === w.exam) weights.set(w.topic_id, Number(w.avg_questions))
    }
  }

  const resultsBySubject = new Map<string, { correct: number; wrong: number; empty: number }[]>()
  for (const e of exams ?? []) for (const r of e.exam_results ?? []) {
    const list = resultsBySubject.get(r.subject_id) ?? []
    list.push(r)
    resultsBySubject.set(r.subject_id, list)
  }

  const assessment = new Map<string, RoadmapTopicInput["assessment"]>()
  for (const a of assess ?? []) if (isSelfAssessment(a.status)) assessment.set(a.topic_id, a.status)

  const gapAtomByTopic = new Map<string, { name: string; wrongs: number }>()
  for (const g of gap ?? []) {
    if (g.wrong_count <= 0 || !(GAP_CONFIDENT_LEVELS as readonly string[]).includes(g.confidence)) continue
    const cur = gapAtomByTopic.get(g.topic_id)
    if (!cur || cur.wrongs < g.wrong_count) gapAtomByTopic.set(g.topic_id, { name: g.atom_name, wrongs: g.wrong_count })
  }

  const topicInputs: RoadmapTopicInput[] = scopeTopics.map((t) => {
    const subj = subjectById.get(t.subject_id)!
    const m = mastery.get(t.id)
    const est = (SUBJECT_EXAM_QUESTIONS[subj.name] ?? DEFAULT_SUBJECT_EXAM_QUESTIONS) / Math.max(topicCountBySubject.get(t.subject_id) ?? 1, 1)
    const w = weights.get(t.id)
    return {
      topic_id: t.id,
      topic_name: t.name,
      subject_id: t.subject_id,
      subject_name: subj.name,
      weight: w ?? est,
      weightEstimated: w === undefined,
      effective: m?.effective ?? NO_DATA_MASTERY,
      assessment: assessment.get(t.id) ?? null,
      examWrongs: m?.examWrongs ?? 0,
      netGap: netGapFactor(resultsBySubject.get(t.subject_id) ?? []),
      gapAtom: gapAtomByTopic.get(t.id)?.name ?? null,
    }
  })

  // Mevcut aktif hedefler (öğrencinin kendi, koçtan, önceki UpPlan) → yol haritasında sabit.
  const existing: ExistingGoal[] = goals
    .filter((g) => g.status === "aktif")
    .map((g) => {
      const effective = mastery.get(g.topic_id)?.effective ?? NO_DATA_MASTERY
      const bt = blockTypeFor(effective)
      const remainingQ = Math.max((g.hedef_soru ?? 0) - g.cozulen_soru, 0)
      return {
        assignment_id: g.id,
        topic_id: g.topic_id,
        source: g.created_by_role,
        remainingMinutes: needMinutes(bt === "konu_calisma" && g.cozulen_soru > 0 ? "soru_cozum" : bt, remainingQ, mpq),
        son_tarih: g.son_tarih,
      }
    })
  // Aynı konuda birden fazla aktif hedef varsa ilki.
  const seen = new Set<string>()
  const existingUnique = existing.filter((e) => (seen.has(e.topic_id) ? false : (seen.add(e.topic_id), true)))
  const completedTopicIds = goals.filter((g) => g.status === "tamamlandi").map((g) => g.topic_id)

  const weeksLeft = weeksUntil(today, examDate)
  return {
    profile,
    coachId: student?.coach_id ?? null,
    today,
    examDate,
    input: {
      today,
      examDate,
      weeklyMinutes: weeklyCapacityMinutes({
        availableMinutes: availableMinutes(profile),
        segment: profile.segment,
        weeksLeft,
        loadFactor: profile.load_factor,
      }),
      minutesPerQuestion: mpq,
      topics: topicInputs,
      existing: existingUnique,
      completedTopicIds,
      edges,
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Taslak üretimi ve onay
// ─────────────────────────────────────────────────────────────────────────

/** Taslak üretir ve kaydeder. Koçlu öğrencide durum koca_onerildi. (admin client) */
export async function generateRoadmapDraft(admin: Client, studentId: string): Promise<{ payload: RoadmapPayload; coached: boolean } | { error: string }> {
  const ctx = await gatherRoadmapContext(admin, studentId)
  if (!ctx) return { error: "Önce UpPlan kurulumunu tamamla." }
  if (ctx.input.topics.length === 0) return { error: "Kapsamında aktif konu bulunamadı." }
  const roadmap = buildRoadmap(ctx.input)
  if (roadmap.brokenCycles.length) console.warn("UpPlan ön koşul döngüsü kırıldı", studentId, roadmap.brokenCycles)
  const payload: RoadmapPayload = { ...roadmap, edges: ctx.input.edges, segment: ctx.profile.segment }
  const coached = !!ctx.coachId
  const { error } = await admin.from("upplan_roadmaps").upsert({
    student_id: studentId,
    status: coached ? "koca_onerildi" : "taslak",
    payload: payload as unknown as Json,
    generated_at: new Date().toISOString(),
    approved_at: null,
    approved_by: null,
  })
  if (error) {
    console.error("generateRoadmapDraft", error)
    return { error: "Yol haritası kaydedilemedi." }
  }
  return { payload, coached }
}

/**
 * Onay: taslağı topic_assignments'a uygular (created_by_role='ai', origin='upplan').
 * Mevcut (öğrenci/koç) hedeflere dokunulmaz; önceki UpPlan kuyruğu yerinde güncellenir,
 * taslakta olmayan kuyruk satırları iptal edilir (silinmez).
 */
export async function applyRoadmap(admin: Client, studentId: string, approvedBy: string): Promise<{ error?: string }> {
  const { data: row } = await admin.from("upplan_roadmaps").select("payload, status").eq("student_id", studentId).maybeSingle()
  const payload = parsePayload(row?.payload)
  if (!row || !payload) return { error: "Onaylanacak yol haritası yok." }
  if (row.status === "koca_onerildi") return { error: "Koçlu öğrencide yol haritası koçun onayına gider." }

  const { data: upRows } = await admin
    .from("topic_assignments")
    .select("id, topic_id, status")
    .eq("student_id", studentId)
    .eq("origin", "upplan")
  const upByTopic = new Map<string, { id: string; status: string }>()
  for (const r of upRows ?? []) if (r.status !== "tamamlandi" && r.status !== "iptal") upByTopic.set(r.topic_id, r)

  const inserts: Database["public"]["Tables"]["topic_assignments"]["Insert"][] = []
  for (const it of payload.items) {
    if (it.existing && it.existing.source !== "ai") continue // öğrenci/koç hedefi: dokunma
    const fields = {
      plan_order: it.plan_order,
      wave: it.wave,
      block_type: it.block_type,
      hedef_soru: it.target_questions,
      hedef_dogruluk: it.target_accuracy,
      notes: it.reasons[0] ?? null,
    }
    const prev = upByTopic.get(it.topic_id)
    if (prev) {
      upByTopic.delete(it.topic_id)
      const keepActive = prev.status === "aktif"
      const { error } = await admin
        .from("topic_assignments")
        .update({
          ...fields,
          // Çalışılmakta olan hedefin başlangıcı korunur, yalnız sıra/hedef güncellenir.
          ...(keepActive ? {} : { status: it.status, baslangic_tarihi: it.start, son_tarih: it.end }),
        })
        .eq("id", prev.id)
      if (error) return { error: "Yol haritası uygulanamadı." }
    } else if (!it.existing) {
      inserts.push({
        student_id: studentId,
        coach_id: null,
        topic_id: it.topic_id,
        created_by: approvedBy,
        created_by_role: "ai",
        origin: "upplan",
        status: it.status,
        baslangic_tarihi: it.start,
        son_tarih: it.end < it.start ? it.start : it.end,
        ...fields,
      })
    }
  }
  if (inserts.length) {
    const { error } = await admin.from("topic_assignments").insert(inserts)
    if (error) {
      console.error("applyRoadmap insert", error)
      return { error: "Yol haritası uygulanamadı." }
    }
  }
  const dropped = Array.from(upByTopic.values()).filter((r) => r.status !== "aktif").map((r) => r.id)
  if (dropped.length) await admin.from("topic_assignments").update({ status: "iptal" }).in("id", dropped)

  await admin
    .from("upplan_roadmaps")
    .update({ status: "onaylandi", approved_at: new Date().toISOString(), approved_by: approvedBy })
    .eq("student_id", studentId)
  return {}
}

// ─────────────────────────────────────────────────────────────────────────
// İlerleme senkronu: tamamlanan hedef kapanır, sıradaki konu açılır
// ─────────────────────────────────────────────────────────────────────────

export type SyncEvent = { kind: "tamamlandi" | "acildi" | "erken_acildi"; topic_name: string }

export async function syncRoadmapProgress(admin: Client, studentId: string, today = istanbulDateStr()): Promise<SyncEvent[]> {
  const { data: rm } = await admin.from("upplan_roadmaps").select("payload, status").eq("student_id", studentId).maybeSingle()
  const payload = parsePayload(rm?.payload)
  if (!payload || rm?.status !== "onaylandi") return []

  const [goals, mastery] = await Promise.all([loadAssignmentsWithProgress(admin, { studentId }), loadMasteryInfo(admin, studentId)])
  const events: SyncEvent[] = []

  for (const g of goals) {
    if (g.status !== "aktif" || g.created_by_role !== "ai") continue
    const eff = mastery.get(g.topic_id)?.effective ?? NO_DATA_MASTERY
    if (isGoalComplete(g.cozulen_soru, g.hedef_soru, eff)) {
      const { error } = await admin.from("topic_assignments").update({ status: "tamamlandi" }).eq("id", g.id).eq("status", "aktif")
      if (!error) events.push({ kind: "tamamlandi", topic_name: g.topic_name })
    }
  }

  const { data: rows } = await admin
    .from("topic_assignments")
    .select("id, topic_id, status, plan_order, baslangic_tarihi, son_tarih, block_type, hedef_soru, topics(name)")
    .eq("student_id", studentId)
    .in("status", ["aktif", "sirada", "tamamlandi"])
  const list = rows ?? []
  const done = new Set(list.filter((r) => r.status === "tamamlandi").map((r) => r.topic_id))
  const planned = new Set(payload.items.map((i) => i.topic_id))
  let activeCount = list.filter((r) => r.status === "aktif").length
  const queue = list.filter((r) => r.status === "sirada").sort((a, b) => (a.plan_order ?? 1e9) - (b.plan_order ?? 1e9))
  const perSlotDaily = Math.max(payload.weeklyMinutes, 1) / Math.max(payload.activeSlots, 1) / 7

  for (const q of queue) {
    if (activeCount >= payload.activeSlots) break
    const item = payload.items.find((i) => i.topic_id === q.topic_id)
    // Ön koşulu planda olup tamamlanmamış konu açılmaz.
    const blocked = (item?.prereqs ?? []).some((p) => planned.has(p) && !done.has(p))
    if (blocked) continue
    const bt = isBlockType(q.block_type) ? q.block_type : "soru_cozum"
    const need = needMinutes(bt, q.hedef_soru ?? GOAL_TEMPLATES[bt].questions, payload.minutesPerQuestion)
    const end = addDaysIso(today, Math.max(Math.ceil(need / perSlotDaily), 7))
    const { error } = await admin
      .from("topic_assignments")
      .update({ status: "aktif", baslangic_tarihi: today, son_tarih: end })
      .eq("id", q.id)
      .eq("status", "sirada")
    if (error) continue
    activeCount += 1
    events.push({ kind: q.baslangic_tarihi > today ? "erken_acildi" : "acildi", topic_name: q.topics?.name ?? "Konu" })
  }

  const early = events.filter((e) => e.kind === "erken_acildi")
  if (early.length) {
    await admin.from("upplan_notifications").insert(
      early.map((e) => ({ student_id: studentId, kind: "erken_acildi", message: `Öndesin: ${e.topic_name} planlanandan erken açıldı.` })),
    )
  }
  return events
}

// ─────────────────────────────────────────────────────────────────────────
// Sıra değişikliği sonrası kuyruğun yeniden tarihlenmesi
// ─────────────────────────────────────────────────────────────────────────

export async function redateQueue(admin: Client, studentId: string, today = istanbulDateStr()): Promise<{ shifted: { name: string; days: number }[]; overflowed: string[] }> {
  const { data: rm } = await admin.from("upplan_roadmaps").select("payload").eq("student_id", studentId).maybeSingle()
  const payload = parsePayload(rm?.payload)
  if (!payload) return { shifted: [], overflowed: [] }
  const { data: rows } = await admin
    .from("topic_assignments")
    .select("id, status, plan_order, block_type, hedef_soru, son_tarih, topics(name)")
    .eq("student_id", studentId)
    .eq("origin", "upplan")
    .in("status", ["aktif", "sirada"])
  const active = (rows ?? []).filter((r) => r.status === "aktif")
  const queue = (rows ?? []).filter((r) => r.status === "sirada").sort((a, b) => (a.plan_order ?? 1e9) - (b.plan_order ?? 1e9))
  if (!queue.length) return { shifted: [], overflowed: [] }

  // Aktiflerin bittiği en geç tarihten sonra kuyruk başlar.
  const start = active.reduce((m, r) => (r.son_tarih > m ? r.son_tarih : m), today)
  const waves = chunkWaves(queue.map((q) => q.id), payload.activeSlots)
  const sched = scheduleWaves(
    queue.map((q) => {
      const bt = isBlockType(q.block_type) ? q.block_type : "soru_cozum"
      return { id: q.id, needMinutes: needMinutes(bt, q.hedef_soru ?? GOAL_TEMPLATES[bt].questions, payload.minutesPerQuestion), wave: waves.get(q.id)! }
    }),
    { weeklyMinutes: payload.weeklyMinutes, start, planEnd: payload.examPeriodStart },
  )
  const shifted: { name: string; days: number }[] = []
  const overflowed: string[] = []
  for (const q of queue) {
    const s = sched.get(q.id)!
    const name = q.topics?.name ?? "Konu"
    const days = daysBetweenIso(q.son_tarih, s.end)
    if (days >= BIG_SHIFT_DAYS) shifted.push({ name, days })
    if (!s.fits) overflowed.push(name)
    await admin
      .from("topic_assignments")
      .update({ wave: s.wave + 1, baslangic_tarihi: s.start, son_tarih: s.end, ...(s.fits ? {} : { status: "zaman_kalirsa" as const }) })
      .eq("id", q.id)
  }
  return { shifted, overflowed }
}

/** Geride kalan aktif UpPlan hedeflerinin bitişini kalan ihtiyaca göre uzatır. */
export async function extendBehindGoals(admin: Client, studentId: string, today = istanbulDateStr()): Promise<{ name: string; days: number }[]> {
  const { data: rm } = await admin.from("upplan_roadmaps").select("payload").eq("student_id", studentId).maybeSingle()
  const payload = parsePayload(rm?.payload)
  if (!payload) return []
  const goals = (await loadAssignmentsWithProgress(admin, { studentId })).filter((g) => g.status === "aktif" && g.created_by_role === "ai")
  const perSlotDaily = Math.max(payload.weeklyMinutes, 1) / Math.max(payload.activeSlots, 1) / 7
  const out: { name: string; days: number }[] = []
  for (const g of goals) {
    if (paceStatus({ start: g.baslangic_tarihi, end: g.son_tarih, today, solved: g.cozulen_soru, target: g.hedef_soru }) !== "geride") continue
    const remaining = Math.max((g.hedef_soru ?? 0) - g.cozulen_soru, 0)
    const newEnd = addDaysIso(today, Math.max(Math.ceil((remaining * payload.minutesPerQuestion) / perSlotDaily), 7))
    if (newEnd <= g.son_tarih) continue
    const { error } = await admin.from("topic_assignments").update({ son_tarih: newEnd }).eq("id", g.id)
    if (!error) out.push({ name: g.topic_name, days: daysBetweenIso(g.son_tarih, newEnd) })
  }
  return out
}

/** Action'lardan çağrılır: hata akışı bozmasın (best-effort). */
export async function syncRoadmapProgressSafe(admin: Client, studentId: string): Promise<void> {
  try {
    await syncRoadmapProgress(admin, studentId)
  } catch (e) {
    console.error("syncRoadmapProgress", studentId, e)
  }
}
