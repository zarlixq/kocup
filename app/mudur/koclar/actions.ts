"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { inviteCoach as inviteCoachAuth } from "@/lib/auth/invite"

type ActionResult<T = unknown> = { success: boolean; error?: string; data?: T }

const inviteSchema = z.object({
  full_name: z.string().trim().min(3, "Ad soyad en az 3 karakter olmalı."),
  email: z.string().trim().email("Geçerli bir email girin."),
  phone: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
})

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
  return { ok: true as const, userId: user.id }
}

export async function inviteCoach(input: unknown): Promise<ActionResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, error: auth.error }

  const parsed = inviteSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Form hatalı." }
  }

  try {
    await inviteCoachAuth(parsed.data)
  } catch (err) {
    console.error("Koç davet hatası:", err)
    const message = err instanceof Error ? err.message : "Davet gönderilemedi."
    return { success: false, error: message }
  }

  revalidatePath("/mudur/koclar")
  revalidatePath("/mudur")
  return { success: true }
}

const updateSchema = z.object({
  full_name: z.string().trim().min(3),
  phone: z.string().trim().optional().nullable(),
})

export async function updateCoach(id: string, input: unknown): Promise<ActionResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, error: auth.error }

  const parsed = updateSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Form hatalı." }
  }

  const admin = supabaseAdmin()
  const { error } = await admin
    .from("profiles")
    .update({
      full_name: parsed.data.full_name,
      phone: parsed.data.phone ?? null,
    })
    .eq("id", id)
    .eq("role", "coach")

  if (error) {
    console.error("Koç güncelleme hatası:", error)
    return { success: false, error: "Güncellenemedi, tekrar deneyin." }
  }

  revalidatePath("/mudur/koclar")
  return { success: true }
}

export async function deleteCoach(id: string): Promise<ActionResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, error: auth.error }

  const admin = supabaseAdmin()

  const { count: studentCount } = await admin
    .from("students")
    .select("*", { count: "exact", head: true })
    .eq("coach_id", id)

  if (studentCount && studentCount > 0) {
    return {
      success: false,
      error: `Bu koça atanmış ${studentCount} öğrenci var. Önce öğrencileri başka koça atayın.`,
    }
  }

  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) {
    console.error("Koç silme hatası:", error)
    return { success: false, error: "Silinemedi, tekrar deneyin." }
  }

  revalidatePath("/mudur/koclar")
  revalidatePath("/mudur")
  return { success: true }
}
