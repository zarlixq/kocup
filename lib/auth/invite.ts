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
    },
  })

  if (error) throw error
  if (!data.user) throw new Error("Davet gönderildi ama kullanıcı bilgisi alınamadı.")

  return data.user
}
