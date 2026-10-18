"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { istanbulDateStr } from "@/lib/tz"

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
    topic_id: assignment.topic_id,
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

  // Koçun atamasında DB yalnızca status değişikliğine izin verir (migration 201).
  const { data: updated, error } = await supabase
    .from("topic_assignments")
    .update({ status: "tamamlandi" })
    .eq("id", assignmentId)
    .eq("student_id", user.id)
    .select("id")

  if (error) {
    console.error("markAssignmentDone", error)
    return { success: false, error: "İşaretlenemedi, tekrar dene." }
  }
  if (!updated || updated.length === 0) return { success: false, error: "Atama bulunamadı" }

  revalidatePath("/ogrenci/konularim")
  revalidatePath("/ogrenci")
  revalidatePath("/koc/konu-analizi")
  return { success: true }
}

// ─────────────────────────────────────────────────────────────────────────
// Öğrencinin kendine koyduğu konu hedefleri (topic_assignments, coach_id null)
// created_by_role DB trigger'ı ile 'student' yazılır; koç hedefleri buradan
// düzenlenemez/silinemez (RLS + guard_owned_row_update).
// ─────────────────────────────────────────────────────────────────────────

const goalSchema = z
  .object({
    topic_id: z.string().uuid("Konu seçmelisin."),
    son_tarih: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Hedef tarihi seç."),
    hedef_soru: z.number().int().min(1, "Hedef soru en az 1 olmalı.").max(10000).nullable(),
    hedef_dogruluk: z.number().int().min(1).max(100, "Doğruluk hedefi en fazla %100 olabilir.").nullable(),
    notes: z.string().trim().max(500).nullable(),
  })
  .refine((d) => d.hedef_soru != null || d.hedef_dogruluk != null, {
    message: "Hedef soru sayısı veya hedef doğruluk girmelisin.",
  })

export type GoalInput = z.input<typeof goalSchema>

function revalidateGoals(studentId: string) {
  revalidatePath("/ogrenci/konularim")
  revalidatePath("/ogrenci")
  revalidatePath(`/koc/ogrenciler/${studentId}/konu-analizi`)
  revalidatePath(`/koc/ogrenciler/${studentId}/takip`)
}

export async function createMyGoal(input: GoalInput): Promise<ActionResult> {
  try {
    const parsed = goalSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Form hatalı." }
    const d = parsed.data

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Oturum bulunamadı" }

    const today = istanbulDateStr()
    if (d.son_tarih < today) return { success: false, error: "Hedef tarihi bugünden önce olamaz." }

    const { error } = await supabase.from("topic_assignments").insert({
      student_id: user.id,
      coach_id: null,
      topic_id: d.topic_id,
      hedef_soru: d.hedef_soru,
      hedef_dogruluk: d.hedef_dogruluk,
      baslangic_tarihi: today,
      son_tarih: d.son_tarih,
      notes: d.notes || null,
      created_by: user.id,
    })
    if (error) {
      console.error("createMyGoal", error)
      return { success: false, error: "Hedef eklenemedi, tekrar dene." }
    }

    revalidateGoals(user.id)
    return { success: true }
  } catch (e) {
    console.error("createMyGoal", e)
    return { success: false, error: "Bir hata oluştu, tekrar deneyin." }
  }
}

export async function updateMyGoal(goalId: string, input: GoalInput): Promise<ActionResult> {
  try {
    const parsed = goalSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Form hatalı." }
    const d = parsed.data

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Oturum bulunamadı" }

    const { data: existing } = await supabase
      .from("topic_assignments")
      .select("id, created_by_role, baslangic_tarihi")
      .eq("id", goalId)
      .eq("student_id", user.id)
      .maybeSingle()
    if (!existing) return { success: false, error: "Hedef bulunamadı." }
    if (existing.created_by_role !== "student") {
      return { success: false, error: "Koçunun atadığı hedefi düzenleyemezsin; yalnızca tamamlandı işaretleyebilirsin." }
    }
    if (d.son_tarih < existing.baslangic_tarihi) {
      return { success: false, error: "Hedef tarihi başlangıçtan önce olamaz." }
    }

    const { data: updated, error } = await supabase
      .from("topic_assignments")
      .update({
        topic_id: d.topic_id,
        hedef_soru: d.hedef_soru,
        hedef_dogruluk: d.hedef_dogruluk,
        son_tarih: d.son_tarih,
        notes: d.notes || null,
      })
      .eq("id", goalId)
      .eq("student_id", user.id)
      .select("id")
    if (error) {
      console.error("updateMyGoal", error)
      return { success: false, error: "Hedef güncellenemedi, tekrar dene." }
    }
    if (!updated || updated.length === 0) return { success: false, error: "Hedef bulunamadı." }

    revalidateGoals(user.id)
    return { success: true }
  } catch (e) {
    console.error("updateMyGoal", e)
    return { success: false, error: "Bir hata oluştu, tekrar deneyin." }
  }
}

export async function deleteMyGoal(goalId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Oturum bulunamadı" }

    // RLS: öğrenci yalnızca created_by_role='student' satırlarını silebilir.
    const { data: deleted, error } = await supabase
      .from("topic_assignments")
      .delete()
      .eq("id", goalId)
      .eq("student_id", user.id)
      .eq("created_by_role", "student")
      .select("id")
    if (error) {
      console.error("deleteMyGoal", error)
      return { success: false, error: "Hedef silinemedi, tekrar dene." }
    }
    if (!deleted || deleted.length === 0) {
      return { success: false, error: "Hedef bulunamadı ya da koçunun atadığı bir hedef." }
    }

    revalidateGoals(user.id)
    return { success: true }
  } catch (e) {
    console.error("deleteMyGoal", e)
    return { success: false, error: "Bir hata oluştu, tekrar deneyin." }
  }
}
