"use server"

import { supabaseAdmin } from "@/lib/supabase/admin"
import { getSiteUrl } from "@/lib/site-url"
import type { User } from "@supabase/supabase-js"

type InviteStudentParams = {
  email: string
  full_name: string
  phone?: string | null
  grade?: string | null
  target_university?: string | null
  target_department?: string | null
  target_ranking?: number | null
  parent_name?: string | null
  parent_phone?: string | null
  /** Kurum importu için: davet metadata'sına geçilir, handle_new_user trigger okur. */
  organization_id?: string | null
  /** Toplu importta her satırda listUsers maliyetini ve sayfa limitini önlemek için. */
  skipGhostCleanup?: boolean
}

type InviteCoachParams = {
  email: string
  full_name: string
  phone?: string | null
  /** Kurum koçu için: davet metadata'sına geçilir, handle_new_user trigger okur. */
  organization_id?: string | null
}

type CreateWithPasswordParams = {
  email: string
  password: string
  full_name: string
  phone?: string | null
  organization_id?: string | null
}

// Davet öncesi hayalet kayıt kontrolü.
// Bir önceki silme (FK constraint yüzünden) yarım kaldıysa, veya kullanıcı
// dashboard'tan elle profil sildiyse, auth.users'ta orphan kayıt kalmış olabilir.
// Henüz davet kabul edilmemiş (email_confirmed_at null + last_sign_in_at null)
// orphan'ı sessizce temizleriz; gerçek/aktif bir kullanıcıysa hata fırlatırız.
async function cleanupGhostUserIfAny(email: string): Promise<void> {
  const admin = supabaseAdmin()
  // listUsers paginated; email'e göre filtre yok, küçük sistemde tek sayfa yeter.
  // Büyürse cursor-based listeleme gerekecek.
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 })
  if (error) return

  const normalized = email.trim().toLowerCase()
  const match = data.users.find((u) => u.email?.toLowerCase() === normalized)
  if (!match) return

  const isGhost = !match.email_confirmed_at && !match.last_sign_in_at
  if (!isGhost) {
    throw new Error(
      "Bu email zaten aktif bir kullanıcıya ait. Lütfen önce mevcut hesabı temizleyin."
    )
  }

  // Orphan'ı temizle. FK constraint hatası verirse, ortada bağımlı kayıt var
  // demektir; üst katmanda anlaşılır hataya çevirelim.
  const { error: delErr } = await admin.auth.admin.deleteUser(match.id)
  if (delErr) {
    throw new Error(
      `Önceki yarım kalmış kayıt temizlenemedi: ${delErr.message}. Lütfen müdüre başvurun.`
    )
  }
}

export async function inviteStudent(params: InviteStudentParams): Promise<User> {
  if (!params.skipGhostCleanup) await cleanupGhostUserIfAny(params.email)

  const admin = supabaseAdmin()
  const siteUrl = getSiteUrl()

  const { data, error } = await admin.auth.admin.inviteUserByEmail(params.email, {
    redirectTo: `${siteUrl}/auth/callback`,
    data: {
      role: "student",
      full_name: params.full_name,
      phone: params.phone ?? undefined,
      organization_id: params.organization_id ?? undefined,
    },
  })

  if (error) throw error
  if (!data.user) throw new Error("Davet gönderildi ama kullanıcı bilgisi alınamadı.")

  return data.user
}

type CreateStudentWithPasswordParams = {
  email: string
  password: string
  full_name: string
  phone?: string | null
  organization_id?: string | null
}

/**
 * Kurum importu için: MAIL GÖNDERMEDEN geçici şifreyle öğrenci hesabı oluşturur.
 * email_confirm:true → öğrenci doğrudan signInWithPassword ile girebilir.
 * handle_new_user trigger user_metadata.role'den profiles satırını oluşturur;
 * students kaydı ve must_change_password çağıran tarafından set edilir.
 */
export async function createStudentWithPassword(
  params: CreateStudentWithPasswordParams,
): Promise<User> {
  const admin = supabaseAdmin()
  const { data, error } = await admin.auth.admin.createUser({
    email: params.email,
    password: params.password,
    email_confirm: true,
    user_metadata: {
      role: "student",
      full_name: params.full_name,
      phone: params.phone ?? undefined,
      organization_id: params.organization_id ?? undefined,
    },
  })
  if (error) throw error
  if (!data.user) throw new Error("Hesap oluşturuldu ama kullanıcı bilgisi alınamadı.")
  return data.user
}

export async function inviteCoach(params: InviteCoachParams): Promise<User> {
  await cleanupGhostUserIfAny(params.email)

  const admin = supabaseAdmin()
  const siteUrl = getSiteUrl()

  const { data, error } = await admin.auth.admin.inviteUserByEmail(params.email, {
    redirectTo: `${siteUrl}/auth/callback`,
    data: {
      role: "coach",
      full_name: params.full_name,
      phone: params.phone ?? undefined,
      // organization_id metadata'ya doğrudan yazılır; trigger profile'ı bu org ile
      // oluşturur (sonradan-patch gereksiz).
      organization_id: params.organization_id ?? undefined,
    },
  })

  if (error) throw error
  if (!data.user) throw new Error("Davet gönderildi ama kullanıcı bilgisi alınamadı.")

  return data.user
}

/**
 * Kuruma manuel koç ekleme: MAIL GÖNDERMEDEN geçici şifreyle koç hesabı oluşturur.
 * handle_new_user trigger role='coach' + organization_id ile profiles satırını üretir;
 * must_change_password çağıran tarafından set edilir.
 */
export async function createCoachWithPassword(
  params: CreateWithPasswordParams,
): Promise<User> {
  const admin = supabaseAdmin()
  const { data, error } = await admin.auth.admin.createUser({
    email: params.email,
    password: params.password,
    email_confirm: true,
    user_metadata: {
      role: "coach",
      full_name: params.full_name,
      phone: params.phone ?? undefined,
      organization_id: params.organization_id ?? undefined,
    },
  })
  if (error) throw error
  if (!data.user) throw new Error("Hesap oluşturuldu ama kullanıcı bilgisi alınamadı.")
  return data.user
}

type InviteOrgAdminParams = {
  email: string
  full_name: string
  phone?: string | null
  organization_id: string
}

/**
 * Kurum yöneticisi (org_admin) davet et. Metadata'ya role='org_admin' + organization_id
 * doğrudan yazılır; trigger profile'ı bu kurum ile oluşturur (sonradan-patch yok).
 */
export async function inviteOrgAdmin(params: InviteOrgAdminParams): Promise<User> {
  await cleanupGhostUserIfAny(params.email)

  const admin = supabaseAdmin()
  const siteUrl = getSiteUrl()

  const { data, error } = await admin.auth.admin.inviteUserByEmail(params.email, {
    redirectTo: `${siteUrl}/auth/callback`,
    data: {
      role: "org_admin",
      full_name: params.full_name,
      phone: params.phone ?? undefined,
      organization_id: params.organization_id,
    },
  })

  if (error) throw error
  if (!data.user) throw new Error("Davet gönderildi ama kullanıcı bilgisi alınamadı.")

  return data.user
}

/**
 * Kurum yöneticisi (org_admin) hesabını MAIL GÖNDERMEDEN geçici şifreyle oluşturur.
 * organization_id zorunlu; must_change_password çağıran tarafından set edilir.
 */
export async function createOrgAdminWithPassword(
  params: CreateWithPasswordParams & { organization_id: string },
): Promise<User> {
  const admin = supabaseAdmin()
  const { data, error } = await admin.auth.admin.createUser({
    email: params.email,
    password: params.password,
    email_confirm: true,
    user_metadata: {
      role: "org_admin",
      full_name: params.full_name,
      phone: params.phone ?? undefined,
      organization_id: params.organization_id,
    },
  })
  if (error) throw error
  if (!data.user) throw new Error("Hesap oluşturuldu ama kullanıcı bilgisi alınamadı.")
  return data.user
}
