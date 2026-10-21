import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"
import { istanbulDaysAgoStr, istanbulWeekStartStr } from "@/lib/tz"
import type { PriorityContext } from "@/lib/resources/video-priority"

type Client = SupabaseClient<Database>

/** Ustalık bu değerin altında ve yeterli kanıt varsa konu zayıf sayılır. */
export const WEAK_MASTERY_THRESHOLD = 50
export const WEAK_MIN_EVIDENCE = 10
/** Yanlış defterinde son kaç gün ve en az kaç kayıt. */
export const WEAK_WRONG_DAYS = 60
export const WEAK_WRONG_MIN = 2

/** Öncelik önerisi için program / hedef / zayıf konu sinyalleri (RLS: çağıranın client'ı). */
export async function loadPriorityContext(db: Client, studentId: string): Promise<PriorityContext> {
  const since = `${istanbulDaysAgoStr(WEAK_WRONG_DAYS)}T00:00:00+03:00`
  const [{ data: program }, { data: goals }, { data: mastery }, { data: wrongs }] = await Promise.all([
    db
      .from("weekly_programs")
      .select("weekly_program_items(topic_id, is_completed, topics(name))")
      .eq("student_id", studentId)
      .eq("week_start", istanbulWeekStartStr())
      .maybeSingle(),
    db
      .from("topic_assignments")
      .select("topic_id, status, topics(name)")
      .eq("student_id", studentId)
      .in("status", ["aktif", "sirada"]),
    db
      .from("student_topic_mastery")
      .select("topic_id, mastery, evidence_n, topics(name)")
      .eq("student_id", studentId)
      .lt("mastery", WEAK_MASTERY_THRESHOLD)
      .gte("evidence_n", WEAK_MIN_EVIDENCE),
    db.from("wrong_answers").select("topic_id, topics(name)").eq("student_id", studentId).gte("created_at", since),
  ])

  const programTopics = new Map<string, string>()
  for (const it of program?.weekly_program_items ?? []) {
    if (it.topic_id && !it.is_completed) programTopics.set(it.topic_id, it.topics?.name ?? "konu")
  }
  const goalTopics = new Map<string, string>()
  const queuedTopics = new Map<string, string>()
  for (const g of goals ?? []) {
    ;(g.status === "aktif" ? goalTopics : queuedTopics).set(g.topic_id, g.topics?.name ?? "konu")
  }
  const weakTopics: PriorityContext["weakTopics"] = new Map()
  for (const m of mastery ?? []) weakTopics.set(m.topic_id, { name: m.topics?.name ?? "konu", wrongCount: 0, mastery: Number(m.mastery) })
  const wrongCount = new Map<string, { name: string; n: number }>()
  for (const w of wrongs ?? []) {
    const cur = wrongCount.get(w.topic_id) ?? { name: w.topics?.name ?? "konu", n: 0 }
    cur.n += 1
    wrongCount.set(w.topic_id, cur)
  }
  for (const [id, w] of wrongCount) {
    if (w.n < WEAK_WRONG_MIN) continue
    const cur = weakTopics.get(id)
    weakTopics.set(id, { name: w.name, wrongCount: w.n, mastery: cur?.mastery ?? null })
  }
  return { programTopics, goalTopics, queuedTopics, weakTopics }
}
