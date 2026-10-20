import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database, Json } from "@/lib/database.types"
import { loadAssignmentsWithProgress } from "@/lib/assignments/load"
import { ensureProgram } from "@/lib/program/ensure-program"
import { istanbulDateStr } from "@/lib/tz"
import {
  EXAM_DATES,
  FORGETTING_REVIEW_RATIO,
  NO_DATA_MASTERY,
  SPACED_REVIEW_DAYS,
} from "@/lib/upplan/config"
import { loadUpplanProfile } from "@/lib/upplan/load"
import { addDaysIso, blockTypeFor } from "@/lib/upplan/roadmap"
import {
  availableMinutes,
  loadMasteryInfo,
  loadMinutesPerQuestion,
  parsePayload,
  weeksUntil,
} from "@/lib/upplan/roadmap-service"
import { scheduleWeek, spacedReviewsDue, type DraftItem, type ProgramGoal, type ProgramReview } from "@/lib/upplan/scheduler"

type Client = SupabaseClient<Database>

// Haftalık program taslağı: üret → (öğrenci onaylar | koç kabul eder) → weekly_program_items.
// Mevcut kalemler (öğrenci/koç/önceki onaylar) korunur; scheduler onların etrafına yerleştirir.
// Program YALNIZ onaylı yol haritasından türetilir: yol haritası yoksa ya da
// onaylanmadıysa taslak üretilmez; hedefler yol haritasındaki konularla sınırlı.

export const ROADMAP_REQUIRED_ERROR = "Önce yol haritanı oluştur ve onayla; program yol haritasından üretilir."

/** Hedefin programdaki öğrenme durumu (scheduler girdisi). */
export function learningFlags(
  g: { id: string; learning_phase: string | null; learned_at: string | null; cozulen_soru: number },
  blockType: string,
  lectureDone: Set<string>,
): { lecture_pending: boolean; short_review_pending: boolean } {
  if (lectureDone.has(g.id) || g.learned_at) return { lecture_pending: false, short_review_pending: false }
  // Aşaması kaydedilmemiş eski hedef: konu çalışması şablonu ve hiç soru yok → konu çalışması.
  const phase = g.learning_phase ?? (blockType === "konu_calisma" && g.cozulen_soru === 0 ? "gerekli" : "yok")
  return { lecture_pending: phase === "gerekli", short_review_pending: phase === "opsiyonel" }
}

export type ProgramDraftMeta = {
  examCount: number
  blockCount: number
  capacityBlocks: number
  unplaced: number
  studyMinutes: number
  focusMinutes: number
}

export function isDraftItem(v: unknown): v is DraftItem {
  if (!v || typeof v !== "object") return false
  const o = v as Record<string, unknown>
  return typeof o.day_of_week === "number" && typeof o.start_time === "string" && typeof o.end_time === "string" && typeof o.baslik === "string"
}

export function parseDraftItems(v: Json | null | undefined): DraftItem[] {
  return Array.isArray(v) ? v.filter(isDraftItem) : []
}

export async function generateProgramDraft(
  admin: Client,
  studentId: string,
  weekStart: string,
  today = istanbulDateStr(),
): Promise<{ items: DraftItem[]; meta: ProgramDraftMeta; coached: boolean } | { error: string }> {
  const profile = await loadUpplanProfile(admin, studentId)
  if (!profile) return { error: "Önce UpPlan kurulumunu tamamla." }
  if (availableMinutes(profile) === 0) return { error: "Müsaitlik ızgaran boş; önce çalışabileceğin saatleri işaretle." }

  const { data: roadmap } = await admin.from("upplan_roadmaps").select("status, payload").eq("student_id", studentId).maybeSingle()
  const payload = parsePayload(roadmap?.payload)
  if (roadmap?.status !== "onaylandi" || !payload) return { error: ROADMAP_REQUIRED_ERROR }
  const roadmapTopics = new Set(payload.items.map((i) => i.topic_id))

  const [{ data: student }, goals, mastery, mpq, { data: program }] = await Promise.all([
    admin.from("students").select("coach_id").eq("id", studentId).maybeSingle(),
    loadAssignmentsWithProgress(admin, { studentId }),
    loadMasteryInfo(admin, studentId),
    loadMinutesPerQuestion(admin, studentId),
    admin
      .from("weekly_programs")
      .select("id, weekly_program_items(day_of_week, start_time, end_time, assignment_id, block_type, topic_id)")
      .eq("student_id", studentId)
      .eq("week_start", weekStart)
      .maybeSingle(),
  ])
  const existingItems = program?.weekly_program_items ?? []
  const linked = new Map<string, number>()
  for (const i of existingItems) if (i.assignment_id) linked.set(i.assignment_id, (linked.get(i.assignment_id) ?? 0) + 1)
  const lectureDone = new Set(existingItems.filter((i) => i.block_type === "konu_calisma" && i.assignment_id).map((i) => i.assignment_id!))

  const programGoals: ProgramGoal[] = goals
    .filter((g) => g.status === "aktif" && roadmapTopics.has(g.topic_id) && g.hedef_soru !== null && g.cozulen_soru < g.hedef_soru)
    .map((g) => {
      const eff = mastery.get(g.topic_id)?.effective ?? NO_DATA_MASTERY
      const bt = blockTypeFor(eff)
      return {
        assignment_id: g.id,
        topic_id: g.topic_id,
        topic_name: g.topic_name,
        subject_id: g.subject_id,
        subject_name: g.subject_name,
        block_type: bt,
        remaining_questions: (g.hedef_soru ?? 0) - g.cozulen_soru,
        ...learningFlags(g, g.block_type ?? bt, lectureDone),
        son_tarih: g.son_tarih < weekStart ? addDaysIso(weekStart, 6) : g.son_tarih,
        scheduled_blocks: linked.get(g.id) ?? 0,
      }
    })

  // Tekrarlar: tamamlanan UpPlan hedefleri (aralıklı) + unutulmaya başlayan konular.
  const { data: doneRows } = await admin
    .from("topic_assignments")
    .select("topic_id, updated_at, topics(name, subject_id, subjects(name))")
    .eq("student_id", studentId)
    .eq("status", "tamamlandi")
  const reviewedThisWeek = new Set(existingItems.filter((i) => i.block_type === "tekrar" && i.topic_id).map((i) => i.topic_id!))
  const reviews: ProgramReview[] = []
  const topicMeta = new Map<string, { name: string; subject_id: string; subject_name: string }>()
  for (const d of doneRows ?? []) {
    if (d.topics) topicMeta.set(d.topic_id, { name: d.topics.name, subject_id: d.topics.subject_id, subject_name: d.topics.subjects?.name ?? "" })
  }
  const spaced = spacedReviewsDue(
    (doneRows ?? []).map((d) => ({ topic_id: d.topic_id, completed_on: (d.updated_at ?? "").slice(0, 10) })),
    weekStart,
    SPACED_REVIEW_DAYS,
  )
  for (const s of spaced) {
    const m = topicMeta.get(s.topic_id)
    if (m && !reviewedThisWeek.has(s.topic_id)) reviews.push({ topic_id: s.topic_id, topic_name: m.name, subject_id: m.subject_id, subject_name: m.subject_name, due: s.due, reason: "aralikli" })
  }
  const forgetting = Array.from(mastery.entries()).filter(
    ([id, m]) => m.last && m.effective < m.stored * FORGETTING_REVIEW_RATIO && !reviewedThisWeek.has(id) && !reviews.some((r) => r.topic_id === id) && !programGoals.some((g) => g.topic_id === id),
  )
  if (forgetting.length) {
    const { data: ts } = await admin.from("topics").select("id, name, subject_id, subjects(name)").in("id", forgetting.map(([id]) => id))
    for (const t of ts ?? []) reviews.push({ topic_id: t.id, topic_name: t.name, subject_id: t.subject_id, subject_name: t.subjects?.name ?? "", due: weekStart, reason: "unutma" })
  }

  const res = scheduleWeek({
    weekStart,
    today,
    availability: profile.availability,
    focusMinutes: profile.focus_minutes,
    loadFactor: profile.load_factor,
    segment: profile.segment,
    weeksLeft: weeksUntil(today, EXAM_DATES[profile.segment].date),
    minutesPerQuestion: mpq,
    goals: programGoals,
    reviews,
    fixed: existingItems
      .filter((i): i is typeof i & { start_time: string; end_time: string } => !!i.start_time && !!i.end_time)
      .map((i) => ({ day_of_week: i.day_of_week, start_time: i.start_time.slice(0, 5), end_time: i.end_time.slice(0, 5) })),
    // Haftada zaten deneme varsa eksik kalanı eklenir; sayaç mevcut + yeni (program sayfasıyla tutarlı).
    existingExams: existingItems.filter((i) => i.block_type === "deneme").length,
  })
  const items = res.items

  const coached = !!student?.coach_id
  const meta: ProgramDraftMeta = { ...res.meta, focusMinutes: profile.focus_minutes }
  const { error } = await admin.from("upplan_program_drafts").upsert({
    student_id: studentId,
    week_start: weekStart,
    status: coached ? "koca_onerildi" : "taslak",
    items: items as unknown as Json,
    meta: meta as unknown as Json,
    generated_at: new Date().toISOString(),
    decided_at: null,
    decided_by: null,
  })
  if (error) {
    console.error("generateProgramDraft", error)
    return { error: "Program taslağı kaydedilemedi." }
  }
  return { items, meta, coached }
}

/**
 * Taslağı programa yazar. `writer` öğrenci onayında service role (created_by_role='ai'),
 * koç kabulünde koçun oturum client'ı (trigger 'coach' yazar).
 */
export async function applyProgramDraft(
  admin: Client,
  writer: Client,
  studentId: string,
  weekStart: string,
  decidedBy: string,
  pick?: number[],
): Promise<{ error?: string; count?: number }> {
  const { data: draft } = await admin
    .from("upplan_program_drafts")
    .select("items, status")
    .eq("student_id", studentId)
    .eq("week_start", weekStart)
    .maybeSingle()
  if (!draft || (draft.status !== "taslak" && draft.status !== "koca_onerildi")) return { error: "Onaylanacak taslak yok." }
  const all = parseDraftItems(draft.items)
  const items = pick ? all.filter((_, i) => pick.includes(i)) : all
  if (items.length === 0) return { error: "Seçili kalem yok." }

  const prog = await ensureProgram(writer, studentId, weekStart, decidedBy)
  if ("error" in prog) return { error: prog.error }
  const { data: last } = await writer
    .from("weekly_program_items")
    .select("order_index")
    .eq("program_id", prog.id)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle()
  let order = (last?.order_index ?? 0) + 1
  const writerIsAdmin = writer === admin
  const { error } = await writer.from("weekly_program_items").insert(
    items.map((i) => ({
      program_id: prog.id,
      day_of_week: i.day_of_week,
      start_time: i.start_time,
      end_time: i.end_time,
      subject_id: i.subject_id,
      topic_id: i.topic_id,
      assignment_id: i.assignment_id,
      block_type: i.block_type,
      baslik: i.baslik.slice(0, 120),
      hedef_soru: i.hedef_soru,
      aciklama: "UpPlan",
      order_index: order++,
      ...(writerIsAdmin ? { created_by_role: "ai" } : {}),
    })),
  )
  if (error) {
    console.error("applyProgramDraft", error)
    return { error: "Program yazılamadı." }
  }
  await admin
    .from("upplan_program_drafts")
    .update({ status: "onaylandi", decided_at: new Date().toISOString(), decided_by: decidedBy })
    .eq("student_id", studentId)
    .eq("week_start", weekStart)
  return { count: items.length }
}

