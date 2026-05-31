"use server"

import { supabaseAdmin } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { getSiteUrl } from "@/lib/site-url"

const RESEND_COOLDOWN_MS = 5 * 60 * 1000

export type ResendResult = { success: true } | { success: false; error: string }

type ResendOpts = {
  /** Geri kayıt yapan caller. "admin" platform müdürü, "org_admin" kurum yöneticisi. */
  caller: "admin" | "org_admin"
}

/**
 * Henüz şifre belirlememiş bir kullanıcıya davet linkini tekrar gönderir.
 *
 * Yetkilendirme:
 * - "admin": platform müdürü (`profiles.role = 'admin'`), her hedef kullanıcıya gönderebilir.
 * - "org_admin": kurum yöneticisi, sadece kendi `organization_id`'sindeki hedef kullanıcıya
 *   gönderebilir.
 *
 * Şartlar:
 * - Hedef kullanıcı en az bir kere giriş yapmışsa hata: "Bu kullanıcı zaten giriş yapmış."
 * - Son davetten itibaren 5 dakika geçmemişse hata: "Lütfen X dakika sonra tekrar deneyin."
 */
export async function resendInvitationServer(
  targetUserId: string,
  opts: ResendOpts,
): Promise<ResendResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Oturum bulunamadı." }

  // Caller doğrulama
  const { data: caller } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", user.id)
    .maybeSingle()
  if (!caller) return { success: false, error: "Profil bulunamadı." }

  if (opts.caller === "admin" && caller.role !== "admin") {
    return { success: false, error: "Yetkisiz işlem." }
  }
  if (opts.caller === "org_admin" && caller.role !== "org_admin") {
    return { success: false, error: "Yetkisiz işlem." }
  }

  // Hedef doğrulama
  const admin = supabaseAdmin()
  const { data: target } = await admin
    .from("profiles")
    .select("id, email, role, organization_id, last_invitation_sent_at")
    .eq("id", targetUserId)
    .maybeSingle()

  if (!target) return { success: false, error: "Hedef kullanıcı bulunamadı." }

  if (opts.caller === "org_admin") {
    if (!target.organization_id || target.organization_id !== caller.organization_id) {
      return { success: false, error: "Bu kullanıcı kurumunuza ait değil." }
    }
  }

  // Hedef auth kaydını al — last_sign_in_at kontrolü için
  const { data: authData, error: authErr } = await admin.auth.admin.getUserById(targetUserId)
  if (authErr || !authData?.user) {
    return { success: false, error: "Auth kaydı bulunamadı." }
  }
  if (authData.user.last_sign_in_at) {
    return {
      success: false,
      error: "Bu kullanıcı en az bir kere giriş yaptığı için davet linki yeniden gönderilemez.",
    }
  }

  // Cool-down kontrolü
  if (target.last_invitation_sent_at) {
    const lastMs = new Date(target.last_invitation_sent_at).getTime()
    const elapsed = Date.now() - lastMs
    if (elapsed < RESEND_COOLDOWN_MS) {
      const remaining = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000)
      const min = Math.ceil(remaining / 60)
      return {
        success: false,
        error: `Çok kısa süre önce davet gönderildi. Lütfen ${min} dk sonra tekrar deneyin.`,
      }
    }
  }

  // Not: `inviteUserByEmail` mevcut kullanıcı için "User already registered" döner.
  // Resend akışında recovery email kullanılır — kullanıcı /auth/callback üzerinden
  // /sifre-belirle'ye iner, davet ile aynı sonuca ulaşır.
  const siteUrl = getSiteUrl()
  const { error: inviteErr } = await supabase.auth.resetPasswordForEmail(target.email, {
    redirectTo: `${siteUrl}/auth/callback`,
  })

  if (inviteErr) {
    console.error("resendInvitation hata:", inviteErr)
    return { success: false, error: "Davet gönderilemedi: " + inviteErr.message }
  }

  await admin
    .from("profiles")
    .update({ last_invitation_sent_at: new Date().toISOString() })
    .eq("id", targetUserId)

  return { success: true }
}
