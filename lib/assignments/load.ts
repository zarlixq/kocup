import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"
import { QUEUED_STATUSES, type AssignmentStatus } from "@/lib/assignments/constants"
import {
  computeAssignmentProgress,
  PROGRESS_SESSION_COLUMNS,
  type ProgressSession,
} from "@/lib/assignments/progress"

type Client = SupabaseClient<Database>

export type CreatedByRole = "student" | "coach" | "ai"

export type AssignmentWithProgress = {
  id: string
  student_id: string
  coach_id: string | null
  topic_id: string
  topic_name: string
  subject_id: string
  subject_name: string
  hedef_soru: number | null
  hedef_dogruluk: number | null
  hedef_sure_dk: number | null
  baslangic_tarihi: string
  son_tarih: string
  notes: string | null
  status: AssignmentStatus
  created_by_role: CreatedByRole
  cozulen_soru: number
  dogru_sayisi: number
  toplam_sure_dk: number
}

export function toCreatedByRole(v: string | null | undefined): CreatedByRole {
  return v === "student" || v === "ai" ? v : "coach"
}

/**
 * Konu hedefleri/atamaları + soru çözüm kayıtlarından otomatik ilerleme.
 * Kapsam çağıranın RLS'i + filtrelerle belirlenir.
 * - studentId: tek öğrenci
 * - coachScopeId: koç görünümü → koçun kendi atamaları + öğrencinin kendi hedefleri
 *   (öğrencinin önceki koçlarına ait atamalar hariç)
 */
export async function loadAssignmentsWithProgress(
  supabase: Client,
  opts: { studentId?: string; coachScopeId?: string } = {},
): Promise<AssignmentWithProgress[]> {
  let q = supabase
    .from("topic_assignments")
    .select(
      "id, student_id, coach_id, topic_id, hedef_soru, hedef_dogruluk, hedef_sure_dk, baslangic_tarihi, son_tarih, notes, status, created_by_role, topics(name, subject_id, subjects(id, name))",
    )
    // Yol haritası kuyruğundaki (açılmamış) hedefler ilerleme ekranlarına girmez.
    .not("status", "in", `(${QUEUED_STATUSES.join(",")})`)
  if (opts.studentId) q = q.eq("student_id", opts.studentId)
  if (opts.coachScopeId) q = q.or(`coach_id.eq.${opts.coachScopeId},created_by_role.eq.student`)

  const { data: assignments, error } = await q
  if (error) {
    console.error("loadAssignmentsWithProgress", error)
    return []
  }
  const list = assignments ?? []
  if (list.length === 0) return []

  const ids = list.map((a) => a.id)
  const topicIds = Array.from(new Set(list.map((a) => a.topic_id)))
  const studentIds = Array.from(new Set(list.map((a) => a.student_id)))
  const minStart = list.reduce((m, a) => (a.baslangic_tarihi < m ? a.baslangic_tarihi : m), list[0].baslangic_tarihi)
  const maxEnd = list.reduce((m, a) => (a.son_tarih > m ? a.son_tarih : m), list[0].son_tarih)

  // (a) doğrudan bağlı kayıtlar, (b) konu + tarih aralığıyla eşleşen bağsız kayıtlar.
  const [{ data: linked }, { data: byTopic }] = await Promise.all([
    supabase.from("study_sessions").select(PROGRESS_SESSION_COLUMNS).in("assignment_id", ids),
    supabase
      .from("study_sessions")
      .select(PROGRESS_SESSION_COLUMNS)
      .is("assignment_id", null)
      .in("student_id", studentIds)
      .in("topic_id", topicIds)
      .gte("date", minStart)
      .lte("date", maxEnd),
  ])

  // Konu eşleşmesi aynı öğrencinin kaydı olmalı: oturumu öğrenciye göre ayır.
  const sessionsByStudent = new Map<string, ProgressSession[]>()
  const pushFor = (studentId: string, s: ProgressSession) => {
    const arr = sessionsByStudent.get(studentId)
    if (arr) arr.push(s)
    else sessionsByStudent.set(studentId, [s])
  }
  const asgStudent = new Map(list.map((a) => [a.id, a.student_id]))
  for (const s of (linked ?? []) as (ProgressSession & { student_id?: string })[]) {
    const sid = s.assignment_id ? asgStudent.get(s.assignment_id) : undefined
    if (sid) pushFor(sid, s)
  }
  for (const s of (byTopic ?? []) as (ProgressSession & { student_id: string })[]) {
    pushFor(s.student_id, s)
  }

  const progress = new Map<string, { cozulen: number; dogru: number; sure: number }>()
  for (const sid of studentIds) {
    const own = list.filter((a) => a.student_id === sid)
    const m = computeAssignmentProgress(own, sessionsByStudent.get(sid) ?? [])
    m.forEach((v, k) => progress.set(k, v))
  }

  return list.map((a) => {
    const p = progress.get(a.id) ?? { cozulen: 0, dogru: 0, sure: 0 }
    return {
      id: a.id,
      student_id: a.student_id,
      coach_id: a.coach_id,
      topic_id: a.topic_id,
      topic_name: a.topics?.name ?? "—",
      subject_id: a.topics?.subject_id ?? "",
      subject_name: a.topics?.subjects?.name ?? "—",
      hedef_soru: a.hedef_soru,
      hedef_dogruluk: a.hedef_dogruluk,
      hedef_sure_dk: a.hedef_sure_dk,
      baslangic_tarihi: a.baslangic_tarihi,
      son_tarih: a.son_tarih,
      notes: a.notes,
      status: a.status as AssignmentStatus,
      created_by_role: toCreatedByRole(a.created_by_role),
      cozulen_soru: p.cozulen,
      dogru_sayisi: p.dogru,
      toplam_sure_dk: p.sure,
    }
  })
}
