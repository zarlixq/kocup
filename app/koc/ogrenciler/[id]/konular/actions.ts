"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

type ActionResult = { success: boolean; error?: string }

async function requireCoachOf(studentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: "Oturum bulunamadı." }
  const { data: student } = await supabase
    .from("students")
    .select("coach_id")
    .eq("id", studentId)
    .maybeSingle()
  if (!student || student.coach_id !== user.id) {
    return { ok: false as const, error: "Bu öğrenciye erişim yetkin yok." }
  }
  return { ok: true as const, userId: user.id, supabase }
}

const assignSchema = z.object({
  topicIds: z.array(z.string().uuid()).min(1, "En az bir konu seç."),
})

export async function assignTopicsToStudent(studentId: string, input: unknown): Promise<ActionResult> {
  const auth = await requireCoachOf(studentId)
  if (!auth.ok) return { success: false, error: auth.error }

  const parsed = assignSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Form hatalı." }
  }

  const { data: existing } = await auth.supabase
    .from("student_topics")
    .select("topic_id")
    .eq("student_id", studentId)
    .in("topic_id", parsed.data.topicIds)
  const existingIds = new Set((existing ?? []).map((r) => r.topic_id))

  const newRows = parsed.data.topicIds
    .filter((tid) => !existingIds.has(tid))
    .map((topic_id) => ({ student_id: studentId, topic_id, status: "basla" as const }))

  if (newRows.length === 0) return { success: true }

  const { error } = await auth.supabase.from("student_topics").insert(newRows)
  if (error) return { success: false, error: error.message }

  revalidatePath(`/koc/ogrenciler/${studentId}/konular`)
  revalidatePath(`/koc/ogrenciler/${studentId}`)
  return { success: true }
}

const customSchema = z.object({
  subjectId: z.string().uuid(),
  name: z.string().trim().min(2, "Konu adı en az 2 karakter olmalı."),
})

export async function addCustomTopic(studentId: string, input: unknown): Promise<ActionResult> {
  const auth = await requireCoachOf(studentId)
  if (!auth.ok) return { success: false, error: auth.error }

  const parsed = customSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Form hatalı." }
  }

  const { error } = await auth.supabase.from("student_topics").insert({
    student_id: studentId,
    topic_id: null,
    custom_name: parsed.data.name,
    custom_subject_id: parsed.data.subjectId,
    status: "basla",
  })
  if (error) return { success: false, error: error.message }

  revalidatePath(`/koc/ogrenciler/${studentId}/konular`)
  return { success: true }
}

const statusSchema = z.enum(["basla", "devam", "tamam", "tekrar"])

/**
 * Konu durumunu günceller. Hem koç hem öğrenci çağırabilir; RLS
 * student_topics_update policy zaten student_id=auth.uid() OR is_coach_of OR
 * admin senaryolarını kapsıyor. studentId argümanı revalidatePath için.
 */
export async function updateTopicStatus(
  studentId: string,
  trackingId: string,
  status: unknown,
): Promise<ActionResult> {
  const parsed = statusSchema.safeParse(status)
  if (!parsed.success) return { success: false, error: "Geçersiz durum." }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Oturum bulunamadı." }

  const { data, error } = await supabase
    .from("student_topics")
    .update({ status: parsed.data, updated_at: new Date().toISOString() })
    .eq("id", trackingId)
    .select("student_id")
    .maybeSingle()

  if (error) return { success: false, error: error.message }
  if (!data) return { success: false, error: "Kayıt bulunamadı veya erişim yok." }

  revalidatePath(`/koc/ogrenciler/${studentId}/konular`)
  revalidatePath(`/koc/ogrenciler/${data.student_id}/konular`)
  revalidatePath("/ogrenci/konularim")
  return { success: true }
}

export async function removeTopic(studentId: string, trackingId: string): Promise<ActionResult> {
  const auth = await requireCoachOf(studentId)
  if (!auth.ok) return { success: false, error: auth.error }

  const { error } = await auth.supabase
    .from("student_topics")
    .delete()
    .eq("id", trackingId)
    .eq("student_id", studentId)

  if (error) return { success: false, error: error.message }
  revalidatePath(`/koc/ogrenciler/${studentId}/konular`)
  return { success: true }
}

const progressSchema = z
  .object({
    solved_count: z.coerce.number().int().min(0).max(99999),
    wrong_count: z.coerce.number().int().min(0).max(99999),
    error_notes: z
      .string()
      .trim()
      .max(1000)
      .nullish()
      .transform((v) => (v && v.length > 0 ? v : null)),
  })
  .refine((d) => d.wrong_count <= d.solved_count, {
    message: "Yanlış sayısı çözülenden fazla olamaz.",
    path: ["wrong_count"],
  })

/**
 * Konunun çözülen/yanlış/hata notu özetini günceller. Hem koç (kendi
 * öğrencisi için) hem öğrenci (kendi konusu için) çağırabilir; mevcut
 * student_topics_update RLS policy bu iki durumu da kapsıyor, ek ownership
 * check gerekmez.
 */
export async function updateTopicProgress(
  trackingId: string,
  input: unknown,
): Promise<ActionResult> {
  const parsed = progressSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Geçersiz değer." }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Oturum bulunamadı." }

  const { data, error } = await supabase
    .from("student_topics")
    .update({
      solved_count: parsed.data.solved_count,
      wrong_count: parsed.data.wrong_count,
      error_notes: parsed.data.error_notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", trackingId)
    .select("student_id")
    .maybeSingle()

  if (error) return { success: false, error: error.message }
  if (!data) return { success: false, error: "Kayıt bulunamadı veya erişim yok." }

  revalidatePath(`/koc/ogrenciler/${data.student_id}/konular`)
  revalidatePath(`/mudur/ogrenciler/${data.student_id}/konular`)
  revalidatePath("/ogrenci/konularim")
  return { success: true }
}
