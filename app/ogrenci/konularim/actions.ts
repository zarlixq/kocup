"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const VALID_STATUSES = ["basla", "devam", "tamam", "tekrar"] as const
type Status = (typeof VALID_STATUSES)[number]

export async function updateTopicStatusAction(topicId: string, status: string) {
  if (!VALID_STATUSES.includes(status as Status)) {
    return { error: "Geçersiz statü." }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Oturum bulunamadı." }

  const { error } = await supabase
    .from("student_topics")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", topicId)
    .eq("student_id", user.id)

  if (error) return { error: error.message }

  revalidatePath("/ogrenci/konularim")
  revalidatePath("/ogrenci")
  return { ok: true }
}

// ─────────────────────────────────────────────────────────────────────────
// Hedefli atamalara karşı çalışma kaydı (study_sessions üzerine, assignment_id'li)
// ─────────────────────────────────────────────────────────────────────────

const logSchema = z
  .object({
    assignment_id: z.string().uuid(),
    tarih: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    dogru: z.number().int().min(0),
    yanlis: z.number().int().min(0),
    bos: z.number().int().min(0),
    sure_dk: z.number().int().min(0).nullable().optional(),
  })
  .refine((d) => d.dogru + d.yanlis + d.bos > 0, {
    message: "En az bir soru girişi yapmalısın",
  })

type ActionResult = { success: boolean; error?: string }

export async function logProgress(input: z.input<typeof logSchema>): Promise<ActionResult> {
  const parsed = logSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Geçersiz veri" }
  }
  const data = parsed.data

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Oturum bulunamadı" }

  // Assignment'ı fetch et — student_id eşleşmeli, subject_id'yi topic'ten al
  const { data: assignment } = await supabase
    .from("topic_assignments")
    .select("id, student_id, topic_id, topics(subject_id)")
    .eq("id", data.assignment_id)
    .maybeSingle()

  if (!assignment) return { success: false, error: "Atama bulunamadı" }
  if (assignment.student_id !== user.id) return { success: false, error: "Yetkiniz yok" }

  const subjectId = assignment.topics?.subject_id
  if (!subjectId) return { success: false, error: "Konunun dersi bulunamadı" }

  const total = data.dogru + data.yanlis + data.bos

  const { error } = await supabase.from("study_sessions").insert({
    student_id: user.id,
    subject_id: subjectId,
    assignment_id: data.assignment_id,
    date: data.tarih,
    total_questions: total,
    correct: data.dogru,
    wrong: data.yanlis,
    empty: data.bos,
    duration_minutes: data.sure_dk ?? null,
    created_by: user.id,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath("/ogrenci/konularim")
  revalidatePath("/ogrenci")
  revalidatePath("/ogrenci/analizim")
  revalidatePath(`/koc/ogrenciler/${user.id}/konu-analizi`)
  revalidatePath("/koc/konu-analizi")
  revalidatePath("/koc/takip")
  return { success: true }
}

export async function deleteProgress(sessionId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Oturum bulunamadı" }

  const { error } = await supabase
    .from("study_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("student_id", user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath("/ogrenci/konularim")
  revalidatePath("/ogrenci")
  revalidatePath("/ogrenci/analizim")
  return { success: true }
}

export async function markAssignmentDone(assignmentId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Oturum bulunamadı" }

  // Öğrenci kendi atamasını manuel tamamlandı olarak işaretler
  const { data: a } = await supabase
    .from("topic_assignments")
    .select("id, student_id")
    .eq("id", assignmentId)
    .maybeSingle()
  if (!a || a.student_id !== user.id) return { success: false, error: "Atama bulunamadı" }

  const { error } = await supabase
    .from("topic_assignments")
    .update({ status: "tamamlandi" })
    .eq("id", assignmentId)

  if (error) return { success: false, error: error.message }

  revalidatePath("/ogrenci/konularim")
  revalidatePath("/ogrenci")
  revalidatePath("/koc/konu-analizi")
  return { success: true }
}
