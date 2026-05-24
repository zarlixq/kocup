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

export async function updateTopicStatus(
  studentId: string,
  trackingId: string,
  status: unknown
): Promise<ActionResult> {
  const auth = await requireCoachOf(studentId)
  if (!auth.ok) return { success: false, error: auth.error }

  const parsed = statusSchema.safeParse(status)
  if (!parsed.success) return { success: false, error: "Geçersiz durum." }

  const { error } = await auth.supabase
    .from("student_topics")
    .update({ status: parsed.data, updated_at: new Date().toISOString() })
    .eq("id", trackingId)
    .eq("student_id", studentId)

  if (error) return { success: false, error: error.message }
  revalidatePath(`/koc/ogrenciler/${studentId}/konular`)
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
