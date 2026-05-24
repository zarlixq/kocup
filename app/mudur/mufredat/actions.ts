"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

type ActionResult<T = unknown> = { success: boolean; error?: string; data?: T }

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: "Yetkisiz işlem." }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()
  if (profile?.role !== "admin") return { ok: false as const, error: "Yetkisiz işlem." }
  return { ok: true as const }
}

const subjectSchema = z.object({
  name: z.string().trim().min(2, "Ders adı en az 2 karakter."),
  exam_type: z.enum(["TYT", "AYT"]),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Renk #RRGGBB formatında olmalı."),
  order: z.number().int().min(0),
})

export async function createSubject(input: unknown): Promise<ActionResult<{ id: string }>> {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, error: auth.error }

  const parsed = subjectSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Form hatalı." }
  }

  const admin = supabaseAdmin()
  const { data, error } = await admin
    .from("subjects")
    .insert(parsed.data)
    .select("id")
    .single()

  if (error) {
    console.error("Ders ekleme hatası:", error)
    return { success: false, error: "Ders eklenemedi." }
  }

  revalidatePath("/mudur/mufredat")
  return { success: true, data: { id: data.id } }
}

export async function updateSubject(id: string, input: unknown): Promise<ActionResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, error: auth.error }

  const parsed = subjectSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Form hatalı." }
  }

  const admin = supabaseAdmin()
  const { error } = await admin.from("subjects").update(parsed.data).eq("id", id)

  if (error) {
    console.error("Ders güncelleme hatası:", error)
    return { success: false, error: "Ders güncellenemedi." }
  }

  revalidatePath("/mudur/mufredat")
  return { success: true }
}

export async function deleteSubject(id: string): Promise<ActionResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, error: auth.error }

  const admin = supabaseAdmin()

  const { count: topicCount } = await admin
    .from("topics")
    .select("*", { count: "exact", head: true })
    .eq("subject_id", id)

  if (topicCount && topicCount > 0) {
    // First delete topics
    const { error: tErr } = await admin.from("topics").delete().eq("subject_id", id)
    if (tErr) {
      console.error("Konu toplu silme hatası:", tErr)
      return { success: false, error: "Konular silinemedi." }
    }
  }

  const { error } = await admin.from("subjects").delete().eq("id", id)
  if (error) {
    console.error("Ders silme hatası:", error)
    return { success: false, error: "Ders silinemedi." }
  }

  revalidatePath("/mudur/mufredat")
  return { success: true }
}

const topicSchema = z.object({
  name: z.string().trim().min(2, "Konu adı en az 2 karakter."),
  order: z.number().int().min(0),
})

export async function createTopic(
  subjectId: string,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, error: auth.error }

  const parsed = topicSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Form hatalı." }
  }

  const admin = supabaseAdmin()
  const { data, error } = await admin
    .from("topics")
    .insert({ subject_id: subjectId, ...parsed.data })
    .select("id")
    .single()

  if (error) {
    console.error("Konu ekleme hatası:", error)
    return { success: false, error: "Konu eklenemedi." }
  }

  revalidatePath("/mudur/mufredat")
  return { success: true, data: { id: data.id } }
}

export async function updateTopic(id: string, input: unknown): Promise<ActionResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, error: auth.error }

  const parsed = topicSchema.partial().safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Form hatalı." }
  }

  const admin = supabaseAdmin()
  const { error } = await admin.from("topics").update(parsed.data).eq("id", id)
  if (error) {
    console.error("Konu güncelleme hatası:", error)
    return { success: false, error: "Konu güncellenemedi." }
  }

  revalidatePath("/mudur/mufredat")
  return { success: true }
}

export async function deleteTopic(id: string): Promise<ActionResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, error: auth.error }

  const admin = supabaseAdmin()

  const { count: refCount } = await admin
    .from("student_topics")
    .select("*", { count: "exact", head: true })
    .eq("topic_id", id)

  if (refCount && refCount > 0) {
    return {
      success: false,
      error: `Bu konuya ${refCount} öğrenci takibi bağlı. Önce takipleri kaldırın.`,
    }
  }

  const { error } = await admin.from("topics").delete().eq("id", id)
  if (error) {
    console.error("Konu silme hatası:", error)
    return { success: false, error: "Konu silinemedi." }
  }

  revalidatePath("/mudur/mufredat")
  return { success: true }
}
