import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database, Json } from "@/lib/database.types"
import { loadAssignmentsWithProgress } from "@/lib/assignments/load"
import { generateRoadmapDraft } from "@/lib/upplan/roadmap-service"

type Client = SupabaseClient<Database>

// Yol haritasını yeni algoritmayla değiştirme (Faz D; debug panelindeki "yeniden üret").
// Hiçbir şey silinmez: eski yol haritası ve bekleyen program taslakları upplan_archive'a
// status='superseded' ile kopyalanır; yeni havuzda olmayan ve ilerlemesi olmayan açık
// UpPlan hedefleri 'iptal' olur (id'leri arşivde), ilerlemesi olan hedefler korunur.
// Yeni taslak üretilemiyorsa (müsaitlik / sınıf eksik) canlı yol haritası 'superseded'
// olur ve TYT/AYT hedefleri iptal edilir; öğrenci panelde eksik adımı görür.

export const PROGRAM_UPDATED_MESSAGE =
  "Programın güncellendi: artık sınıfına göre hazırlanıyor. Yeni yol haritanı inceleyip onayla; haftalık programın bundan üretilir."
export const PROGRAM_BLOCKED_MESSAGE = "Programın sınıfına göre yeniden kurulacak. Önce eksik adımı tamamla: "

export type SupersedeResult = {
  studentId: string
  archived: boolean
  cancelledGoals: number
  keptProgressedGoals: number
  newStatus: string | null
  error?: string
}

const OPEN = ["aktif", "sirada", "zaman_kalirsa"] as const

export async function supersedeRoadmap(admin: Client, studentId: string, reason: string): Promise<SupersedeResult> {
  const [{ data: row }, { data: drafts }] = await Promise.all([
    admin.from("upplan_roadmaps").select("status, payload, generated_at").eq("student_id", studentId).maybeSingle(),
    admin.from("upplan_program_drafts").select("week_start, status, items, meta, generated_at").eq("student_id", studentId).in("status", ["taslak", "koca_onerildi"]),
  ])

  // 1) Eski yol haritası ve bekleyen taslaklar, üzerine yazılmadan önce arşive.
  let archiveId: string | null = null
  if (row) {
    const { data: arc, error } = await admin
      .from("upplan_archive")
      .insert({
        student_id: studentId,
        kind: "roadmap",
        previous_status: row.status,
        payload: { roadmap: row.payload, cancelled_assignment_ids: [] } as unknown as Json,
        generated_at: row.generated_at,
        reason,
      })
      .select("id")
      .single()
    if (error) {
      console.error("supersedeRoadmap archive", error)
      return { studentId, archived: false, cancelledGoals: 0, keptProgressedGoals: 0, newStatus: row.status, error: "Arşivlenemedi" }
    }
    archiveId = arc.id
  }
  for (const d of drafts ?? []) {
    const { error } = await admin.from("upplan_archive").insert({
      student_id: studentId,
      kind: "program",
      week_start: d.week_start,
      previous_status: d.status,
      payload: { items: d.items, meta: d.meta } as unknown as Json,
      generated_at: d.generated_at,
      reason,
    })
    if (!error) await admin.from("upplan_program_drafts").update({ status: "superseded" }).eq("student_id", studentId).eq("week_start", d.week_start)
  }

  // 2) Yeni yol haritası (taslak / koça önerildi). Üretilemiyorsa eski satır superseded.
  const gen = await generateRoadmapDraft(admin, studentId)
  const pool = "error" in gen ? null : new Set(gen.payload.items.map((i) => i.topic_id))
  if ("error" in gen && row) await admin.from("upplan_roadmaps").update({ status: "superseded" }).eq("student_id", studentId)

  // 3) Açık UpPlan hedefleri: yeni havuzda olmayan (havuz yoksa TYT/AYT konulu), ilerlemesiz olanlar iptal.
  const [goals, { data: open }] = await Promise.all([
    loadAssignmentsWithProgress(admin, { studentId }),
    admin
      .from("topic_assignments")
      .select("id, topic_id, status, topics(subjects(exam_type))")
      .eq("student_id", studentId)
      .eq("origin", "upplan")
      .in("status", [...OPEN]),
  ])
  const progress = new Map(goals.map((g) => [g.id, g.cozulen_soru > 0 || !!g.learned_at]))
  const stale = (open ?? []).filter((g) => (pool ? !pool.has(g.topic_id) : ["tyt", "ayt"].includes(g.topics?.subjects?.exam_type ?? "")))
  const kept = stale.filter((g) => progress.get(g.id))
  const cancel = stale.filter((g) => !progress.get(g.id)).map((g) => g.id)
  if (archiveId && cancel.length) {
    await admin
      .from("upplan_archive")
      .update({ payload: { roadmap: row!.payload, cancelled_assignment_ids: cancel } as unknown as Json })
      .eq("id", archiveId)
  }
  for (let i = 0; i < cancel.length; i += 200) {
    const { error } = await admin.from("topic_assignments").update({ status: "iptal" }).in("id", cancel.slice(i, i + 200)).eq("student_id", studentId)
    if (error) console.error("supersedeRoadmap cancel", error)
  }

  await admin.from("upplan_notifications").insert({
    student_id: studentId,
    kind: "program_guncellendi",
    message: ("error" in gen ? PROGRAM_BLOCKED_MESSAGE + gen.error : PROGRAM_UPDATED_MESSAGE).slice(0, 500),
  })
  const { data: now } = await admin.from("upplan_roadmaps").select("status").eq("student_id", studentId).maybeSingle()
  return {
    studentId,
    archived: !!archiveId,
    cancelledGoals: cancel.length,
    keptProgressedGoals: kept.length,
    newStatus: now?.status ?? null,
    ...("error" in gen ? { error: gen.error } : {}),
  }
}
