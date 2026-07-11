"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import {
  inviteCoach,
  inviteOrgAdmin as inviteOrgAdminAuth,
  createOrgAdminWithPassword as createOrgAdminWithPasswordAuth,
} from "@/lib/auth/invite"
import { generateTempPassword } from "@/lib/auth/temp-password"
import { slugify } from "@/lib/slug"

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

const optionalText = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v && v.length > 0 ? v : null))

const hexColor = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "Renk #RRGGBB formatında olmalı.")
  .nullish()
  .or(z.literal(""))
  .transform((v) => (v ? v : null))

const orgSchema = z.object({
  name: z.string().trim().min(2, "Kurum adı en az 2 karakter."),
  slug: z
    .string()
    .trim()
    .nullish()
    .transform((v) => (v && v.length > 0 ? slugify(v) : null)),
  logo_url: z
    .string()
    .trim()
    .url("Geçerli bir URL girin.")
    .nullish()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  primary_color: hexColor,
  accent_color: hexColor,
  contact_email: z
    .string()
    .trim()
    .email("Geçerli bir e-posta girin.")
    .nullish()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  contact_phone: optionalText,
  address: optionalText,
  plan: z.enum(["starter", "pro", "enterprise"]).default("starter"),
})

/** Benzersiz slug üret (varsa excludeId hariç). */
async function uniqueSlug(
  admin: ReturnType<typeof supabaseAdmin>,
  base: string,
  excludeId?: string,
): Promise<string> {
  const root = base || "kurum"
  let candidate = root
  let i = 1
  // küçük kurum sayısı → birkaç tur yeterli
  for (;;) {
    const { data } = await admin
      .from("organizations")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle()
    if (!data || data.id === excludeId) return candidate
    i += 1
    candidate = `${root}-${i}`
  }
}

export async function createOrganization(input: unknown): Promise<ActionResult<{ id: string }>> {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, error: auth.error }

  const parsed = orgSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Form hatalı." }
  }

  const admin = supabaseAdmin()
  const slug = await uniqueSlug(admin, parsed.data.slug ?? slugify(parsed.data.name))

  const { data, error } = await admin
    .from("organizations")
    .insert({ ...parsed.data, slug })
    .select("id")
    .single()

  if (error || !data) {
    console.error("Kurum oluşturma hatası:", error)
    return { success: false, error: "Kurum oluşturulamadı." }
  }

  revalidatePath("/mudur/kurumlar")
  return { success: true, data: { id: data.id } }
}

export async function updateOrganization(id: string, input: unknown): Promise<ActionResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, error: auth.error }

  const parsed = orgSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Form hatalı." }
  }

  const admin = supabaseAdmin()
  const slug = await uniqueSlug(admin, parsed.data.slug ?? slugify(parsed.data.name), id)

  const { error } = await admin
    .from("organizations")
    .update({ ...parsed.data, slug })
    .eq("id", id)

  if (error) {
    console.error("Kurum güncelleme hatası:", error)
    return { success: false, error: "Kurum güncellenemedi." }
  }

  revalidatePath("/mudur/kurumlar")
  revalidatePath(`/mudur/kurumlar/${id}`)
  return { success: true }
}

export async function toggleOrganizationActive(id: string, isActive: boolean): Promise<ActionResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, error: auth.error }

  const admin = supabaseAdmin()
  const { error } = await admin.from("organizations").update({ is_active: isActive }).eq("id", id)
  if (error) {
    console.error("Kurum durum hatası:", error)
    return { success: false, error: "Durum güncellenemedi." }
  }

  revalidatePath("/mudur/kurumlar")
  revalidatePath(`/mudur/kurumlar/${id}`)
  return { success: true }
}

const coachInviteSchema = z.object({
  full_name: z.string().trim().min(3, "Ad soyad en az 3 karakter olmalı."),
  email: z.string().trim().email("Geçerli bir e-posta girin."),
  phone: optionalText,
})

/**
 * Bir kuruma koç davet et (mail davetiyle — mevcut koç akışı). Davet sonrası
 * profiles.organization_id = bu kurum olarak server-side patch'lenir.
 */
export async function inviteCoachToOrganization(
  orgId: string,
  input: unknown,
): Promise<ActionResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, error: auth.error }

  const parsed = coachInviteSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Form hatalı." }
  }

  const admin = supabaseAdmin()
  const { data: org } = await admin
    .from("organizations")
    .select("id")
    .eq("id", orgId)
    .maybeSingle()
  if (!org) return { success: false, error: "Kurum bulunamadı." }

  try {
    // organization_id davet metadata'sına doğrudan yazılır; trigger profile'ı bu
    // kurum ile oluşturur (sonradan-patch gereksiz).
    await inviteCoach({
      email: parsed.data.email,
      full_name: parsed.data.full_name,
      phone: parsed.data.phone,
      organization_id: orgId,
    })
  } catch (err) {
    console.error("Kurum koç davet hatası:", err)
    return { success: false, error: err instanceof Error ? err.message : "Davet gönderilemedi." }
  }

  revalidatePath(`/mudur/kurumlar/${orgId}`)
  return { success: true }
}

const orgAdminInviteSchema = z.object({
  full_name: z.string().trim().min(3, "Ad soyad en az 3 karakter olmalı."),
  email: z.string().trim().email("Geçerli bir e-posta girin."),
  phone: optionalText,
})

/** Bir kuruma org_admin (kurum yöneticisi) davet et — mail davetiyle. */
export async function inviteOrgAdmin(orgId: string, input: unknown): Promise<ActionResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, error: auth.error }

  const parsed = orgAdminInviteSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Form hatalı." }
  }

  const admin = supabaseAdmin()
  const { data: org } = await admin
    .from("organizations")
    .select("id")
    .eq("id", orgId)
    .maybeSingle()
  if (!org) return { success: false, error: "Kurum bulunamadı." }

  try {
    await inviteOrgAdminAuth({
      email: parsed.data.email,
      full_name: parsed.data.full_name,
      phone: parsed.data.phone,
      organization_id: orgId,
    })
  } catch (err) {
    console.error("Kurum yöneticisi davet hatası:", err)
    return { success: false, error: err instanceof Error ? err.message : "Davet gönderilemedi." }
  }

  revalidatePath(`/mudur/kurumlar/${orgId}`)
  return { success: true }
}

/**
 * Bir kuruma org_admin'i MANUEL oluştur (mail yok, geçici şifre). Şifre yanıtta
 * döner; müdür ekranda gösterir/kopyalar. İlk girişte /sifre-degistir zorlanır.
 */
export async function createOrgAdminWithPassword(
  orgId: string,
  input: unknown,
): Promise<ActionResult<{ email: string; password: string }>> {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, error: auth.error }

  const parsed = orgAdminInviteSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Form hatalı." }
  }

  const admin = supabaseAdmin()
  const { data: org } = await admin
    .from("organizations")
    .select("id")
    .eq("id", orgId)
    .maybeSingle()
  if (!org) return { success: false, error: "Kurum bulunamadı." }

  const password = generateTempPassword()

  try {
    const created = await createOrgAdminWithPasswordAuth({
      email: parsed.data.email,
      password,
      full_name: parsed.data.full_name,
      phone: parsed.data.phone,
      organization_id: orgId,
    })
    // İlk girişte zorunlu şifre değiştirme (trigger profile'ı oluşturdu)
    await admin.from("profiles").update({ must_change_password: true }).eq("id", created.id)
  } catch (err) {
    console.error("Kurum yöneticisi oluşturma hatası:", err)
    return { success: false, error: err instanceof Error ? err.message : "Hesap oluşturulamadı." }
  }

  revalidatePath(`/mudur/kurumlar/${orgId}`)
  return { success: true, data: { email: parsed.data.email, password } }
}
