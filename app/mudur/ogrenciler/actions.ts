"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

type ActionResult = { success: boolean; error?: string }

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

export async function assignCoach(
  studentId: string,
  coachId: string | null
): Promise<ActionResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, error: auth.error }

  const admin = supabaseAdmin()
  const { error } = await admin
    .from("students")
    .update({ coach_id: coachId })
    .eq("id", studentId)

  if (error) {
    console.error("Koç atama hatası:", error)
    return { success: false, error: "Koç atanamadı, tekrar deneyin." }
  }

  revalidatePath("/mudur/ogrenciler")
  revalidatePath(`/mudur/ogrenciler/${studentId}`)
  revalidatePath("/mudur/koclar")
  return { success: true }
}

const updateSchema = z.object({
  full_name: z.string().trim().min(3),
  phone: z.string().trim().optional().nullable(),
  grade: z.enum(["9", "10", "11", "12", "Mezun"]).optional().nullable(),
  target_university: z.string().trim().optional().nullable(),
  target_department: z.string().trim().optional().nullable(),
  target_ranking: z.number().int().positive().optional().nullable(),
  parent_name: z.string().trim().optional().nullable(),
  parent_phone: z.string().trim().optional().nullable(),
})

export async function updateStudent(id: string, input: unknown): Promise<ActionResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, error: auth.error }

  const parsed = updateSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Form hatalı." }
  }

  const admin = supabaseAdmin()
  const data = parsed.data

  const { error: pErr } = await admin
    .from("profiles")
    .update({ full_name: data.full_name, phone: data.phone ?? null })
    .eq("id", id)
  if (pErr) {
    console.error("Profil güncelleme hatası:", pErr)
    return { success: false, error: "Güncellenemedi." }
  }

  const { error: sErr } = await admin
    .from("students")
    .update({
      grade: data.grade ?? null,
      target_university: data.target_university ?? null,
      target_department: data.target_department ?? null,
      target_ranking: data.target_ranking ?? null,
      parent_name: data.parent_name ?? null,
      parent_phone: data.parent_phone ?? null,
    })
    .eq("id", id)
  if (sErr) {
    console.error("Öğrenci güncelleme hatası:", sErr)
    return { success: false, error: "Güncellenemedi." }
  }

  revalidatePath("/mudur/ogrenciler")
  revalidatePath(`/mudur/ogrenciler/${id}`)
  return { success: true }
}

export async function deleteStudent(id: string): Promise<ActionResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, error: auth.error }

  const admin = supabaseAdmin()
  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) {
    console.error("Öğrenci silme hatası:", error)
    return { success: false, error: "Silinemedi, tekrar deneyin." }
  }

  revalidatePath("/mudur/ogrenciler")
  revalidatePath("/mudur")
  return { success: true }
}
