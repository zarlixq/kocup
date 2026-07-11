"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import {
  inviteCoach as inviteCoachAuth,
  createCoachWithPassword,
} from "@/lib/auth/invite"
import { generateTempPassword } from "@/lib/auth/temp-password"
import { resendInvitationServer, type ResendResult } from "@/lib/auth/resend"

type ActionResult<T = unknown> = { success: boolean; error?: string; data?: T }

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/giris/kurum")
}

async function requireOrgAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: "Yetkisiz işlem." }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", user.id)
    .maybeSingle()

  if (profile?.role !== "org_admin" || !profile.organization_id) {
    return { ok: false as const, error: "Yetkisiz işlem." }
  }
  return { ok: true as const, userId: user.id, orgId: profile.organization_id }
}

const inviteSchema = z.object({
  full_name: z.string().trim().min(3, "Ad soyad en az 3 karakter olmalı."),
  email: z.string().trim().email("Geçerli bir email girin."),
  phone: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
})

// Kurum içine koç davet et. Davet edilen koç organization_id ile bağlanır.
export async function inviteCoachToOrg(input: unknown): Promise<ActionResult> {
  const auth = await requireOrgAdmin()
  if (!auth.ok) return { success: false, error: auth.error }

  const parsed = inviteSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Form hatalı." }
  }

  try {
    // organization_id davet metadata'sına doğrudan yazılır; trigger profile'ı
    // org_admin'in kendi kurumu ile oluşturur (sonradan-patch yok).
    await inviteCoachAuth({
      ...parsed.data,
      organization_id: auth.orgId,
    })
  } catch (err) {
    console.error("Kurum koç davet hatası:", err)
    const message = err instanceof Error ? err.message : "Davet gönderilemedi."
    return { success: false, error: message }
  }

  revalidatePath("/kurum/koclar")
  revalidatePath("/kurum")
  return { success: true }
}

/**
 * org_admin kendi kurumuna koçu MANUEL oluşturur (mail yok, geçici şifre).
 * Hedef org client'tan ALINMAZ — oturumdaki org_admin'in kendi org'undan türetilir.
 * İlk girişte /sifre-degistir zorlanır.
 */
export async function createCoachWithPasswordOrg(
  input: unknown,
): Promise<ActionResult<{ email: string; password: string }>> {
  const auth = await requireOrgAdmin()
  if (!auth.ok) return { success: false, error: auth.error }

  const parsed = inviteSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Form hatalı." }
  }

  const password = generateTempPassword()

  try {
    const created = await createCoachWithPassword({
      email: parsed.data.email,
      password,
      full_name: parsed.data.full_name,
      phone: parsed.data.phone,
      organization_id: auth.orgId,
    })
    await supabaseAdmin()
      .from("profiles")
      .update({ must_change_password: true })
      .eq("id", created.id)
  } catch (err) {
    console.error("Kurum koç oluşturma hatası:", err)
    return { success: false, error: err instanceof Error ? err.message : "Hesap oluşturulamadı." }
  }

  revalidatePath("/kurum/koclar")
  revalidatePath("/kurum")
  return { success: true, data: { email: parsed.data.email, password } }
}

const brandingSchema = z.object({
  name: z.string().trim().min(2),
  logo_url: z
    .string()
    .url()
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  primary_color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Renk hex formatında olmalı (#RRGGBB)")
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  contact_email: z
    .string()
    .email()
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  contact_phone: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
})

/**
 * Koçu kurumdan çıkar (profile'ı silmez, sadece organization_id = null).
 * Koç bireysel koç olarak sistemde kalır.
 */
export async function removeCoachFromOrg(coachId: string): Promise<ActionResult> {
  const auth = await requireOrgAdmin()
  if (!auth.ok) return { success: false, error: auth.error }

  const admin = supabaseAdmin()
  // Sadece kendi kurumundaki koçu çıkarabilsin
  const { data: target } = await admin
    .from("profiles")
    .select("organization_id, role")
    .eq("id", coachId)
    .maybeSingle()

  if (!target || target.organization_id !== auth.orgId || target.role !== "coach") {
    return { success: false, error: "Bu koç kurumunuza ait değil." }
  }

  const { error } = await admin
    .from("profiles")
    .update({ organization_id: null })
    .eq("id", coachId)

  if (error) {
    console.error("Kurum koç çıkarma hatası:", error)
    return { success: false, error: "İşlem başarısız, tekrar deneyin." }
  }

  revalidatePath("/kurum/koclar")
  revalidatePath("/kurum")
  return { success: true }
}

export async function resendCoachInvitationKurum(coachId: string): Promise<ResendResult> {
  return resendInvitationServer(coachId, { caller: "org_admin" })
}

export async function updateOrgBranding(input: unknown): Promise<ActionResult> {
  const auth = await requireOrgAdmin()
  if (!auth.ok) return { success: false, error: auth.error }

  const parsed = brandingSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Form hatalı." }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("organizations")
    .update(parsed.data)
    .eq("id", auth.orgId)

  if (error) {
    console.error("Kurum güncelleme hatası:", error)
    return { success: false, error: "Güncellenemedi." }
  }

  revalidatePath("/kurum/ayarlar")
  revalidatePath("/kurum")
  return { success: true }
}
