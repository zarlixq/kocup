"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { RESOURCE_TYPES } from "@/lib/resources/constants"

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

const resourceSchema = z.object({
  name: z.string().trim().min(2, "Kaynak adı en az 2 karakter."),
  publisher: z
    .string()
    .trim()
    .max(120)
    .nullish()
    .transform((v) => (v && v.length > 0 ? v : null)),
  subject_id: z
    .string()
    .uuid()
    .nullish()
    .transform((v) => v ?? null),
  type: z.enum(RESOURCE_TYPES),
  total_questions: z.number().int().min(0).nullable().optional(),
})

export async function createResource(input: unknown): Promise<ActionResult<{ id: string }>> {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, error: auth.error }

  const parsed = resourceSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Form hatalı." }
  }

  const admin = supabaseAdmin()
  const { data, error } = await admin
    .from("resources")
    .insert({
      name: parsed.data.name,
      publisher: parsed.data.publisher,
      subject_id: parsed.data.subject_id,
      type: parsed.data.type,
      total_questions: parsed.data.total_questions ?? null,
      is_custom: false,
    })
    .select("id")
    .single()

  if (error) {
    console.error("Kaynak ekleme hatası:", error)
    return { success: false, error: "Kaynak eklenemedi." }
  }

  revalidatePath("/mudur/kaynaklar")
  return { success: true, data: { id: data.id } }
}

export async function updateResource(id: string, input: unknown): Promise<ActionResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, error: auth.error }

  const parsed = resourceSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Form hatalı." }
  }

  const admin = supabaseAdmin()
  const { error } = await admin
    .from("resources")
    .update({
      name: parsed.data.name,
      publisher: parsed.data.publisher,
      subject_id: parsed.data.subject_id,
      type: parsed.data.type,
      total_questions: parsed.data.total_questions ?? null,
    })
    .eq("id", id)

  if (error) {
    console.error("Kaynak güncelleme hatası:", error)
    return { success: false, error: "Kaynak güncellenemedi." }
  }

  revalidatePath("/mudur/kaynaklar")
  return { success: true }
}

export async function deleteResource(id: string): Promise<ActionResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, error: auth.error }

  const admin = supabaseAdmin()

  // Öğrenciye atanmışsa silme (cascade ile öğrenci listelerinden düşmesin)
  const { count: refCount } = await admin
    .from("student_resources")
    .select("*", { count: "exact", head: true })
    .eq("resource_id", id)

  if (refCount && refCount > 0) {
    return {
      success: false,
      error: `Bu kaynak ${refCount} öğrenciye atanmış. Önce atamaları kaldırın.`,
    }
  }

  const { error } = await admin.from("resources").delete().eq("id", id)
  if (error) {
    console.error("Kaynak silme hatası:", error)
    return { success: false, error: "Kaynak silinemedi." }
  }

  revalidatePath("/mudur/kaynaklar")
  return { success: true }
}
