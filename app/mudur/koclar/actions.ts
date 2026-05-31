"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { inviteCoach as inviteCoachAuth } from "@/lib/auth/invite"
import { resendInvitationServer, type ResendResult } from "@/lib/auth/resend"

type ActionResult<T = unknown> = { success: boolean; error?: string; data?: T }

const inviteSchema = z.object({
  full_name: z.string().trim().min(3, "Ad soyad en az 3 karakter olmalı."),
  email: z.string().trim().email("Geçerli bir email girin."),
  phone: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  coach_source: z.enum(["internal", "external"]).default("internal"),
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
    const invited = await inviteCoachAuth({
      email: parsed.data.email,
      full_name: parsed.data.full_name,
      phone: parsed.data.phone,
    })

    // coach_source profiles trigger ile gelmiyor, ardından admin client ile patch
    const admin = supabaseAdmin()
    await admin
      .from("profiles")
      .update({ coach_source: parsed.data.coach_source })
      .eq("id", invited.id)
  } catch (err) {
    console.error("Koç davet hatası:", err)
    const message = err instanceof Error ? err.message : "Davet gönderilemedi."
    return { success: false, error: message }
  }

  revalidatePath("/mudur/koclar")
  revalidatePath("/mudur")
  return { success: true }
}

const sourceSchema = z.object({
  coach_source: z.enum(["internal", "external"]),
})

export async function updateCoachSource(
  coachId: string,
  input: unknown,
): Promise<ActionResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, error: auth.error }

  const parsed = sourceSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Geçersiz değer." }
  }

  const admin = supabaseAdmin()
  const { error } = await admin
    .from("profiles")
    .update({ coach_source: parsed.data.coach_source })
    .eq("id", coachId)
    .eq("role", "coach")

  if (error) {
    console.error("Koç kaynağı güncelleme hatası:", error)
    return { success: false, error: "Güncellenemedi, tekrar deneyin." }
  }

  revalidatePath("/mudur/koclar")
  revalidatePath(`/mudur/koclar/${coachId}`)
  return { success: true }
}

const updateSchema = z.object({
  full_name: z.string().trim().min(3, "Ad soyad en az 3 karakter."),
  phone: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
  bio: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
  certificate_info: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
  years_experience: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .optional()
    .transform((v) => {
      if (v === null || v === undefined || v === "") return null
      const n = Number(v)
      return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null
    }),
  specialties: z
    .union([z.string(), z.array(z.string()), z.null(), z.undefined()])
    .optional()
    .transform((v) => {
      if (!v) return null
      const arr = Array.isArray(v)
        ? v
        : v.split(",").map((s) => s.trim()).filter((s) => s.length > 0)
      return arr.length > 0 ? arr : null
    }),
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
      phone: parsed.data.phone,
      bio: parsed.data.bio,
      certificate_info: parsed.data.certificate_info,
      years_experience: parsed.data.years_experience,
      specialties: parsed.data.specialties,
    })
    .eq("id", id)
    .eq("role", "coach")

  if (error) {
    console.error("Koç güncelleme hatası:", error)
    return { success: false, error: "Güncellenemedi, tekrar deneyin." }
  }

  revalidatePath("/mudur/koclar")
  revalidatePath(`/mudur/koclar/${id}`)
  revalidatePath("/")
  return { success: true }
}

export async function resendCoachInvitationMudur(coachId: string): Promise<ResendResult> {
  return resendInvitationServer(coachId, { caller: "admin" })
}

export async function deleteCoach(id: string): Promise<ActionResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, error: auth.error }

  // Atomik silme: delete_coach_safely DB function'ı öğrenci kontrolü +
  // FK cascade + auth.users silmeyi tek transaction'da yapar.
  // SECURITY DEFINER olduğu için authenticated client ile çağırılır.
  const supabase = await createClient()
  const { error } = await supabase.rpc("delete_coach_safely", { coach_uuid: id })

  if (error) {
    console.error("Koç silme hatası:", error)
    // Postgres exception mesajı zaten Türkçe (function içinde RAISE ile)
    return { success: false, error: error.message || "Silinemedi, tekrar deneyin." }
  }

  revalidatePath("/mudur/koclar")
  revalidatePath("/mudur")
  return { success: true }
}
