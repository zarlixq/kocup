import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getSiteUrl } from "@/lib/site-url"
import { isEmailEnabled, sendEmail } from "@/lib/email/send"
import { passwordResetTemplate, verifyEmailTemplate } from "@/lib/email/templates"
import type { Database } from "@/lib/database.types"

// Doğrulama ve şifre sıfırlama e-postaları.
// RESEND_API_KEY varsa: bağlantıyı admin.generateLink ile üretip KoçUp markalı
// Türkçe e-postayı Resend ile göndeririz (Supabase saatlik e-posta limitine takılmaz).
// Yoksa: Supabase Auth'un kendi e-posta servisine düşeriz (şablonlar Supabase
// panelinden düzenlenir, saatlik limitlidir).

export const AFTER_VERIFY_PATH = "/ogrenci/upplan/kurulum"

function anonClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

function callbackUrl(params: Record<string, string>): string {
  return `${getSiteUrl()}/auth/callback?${new URLSearchParams(params).toString()}`
}

/** Doğrulanmamış hesaba e-posta doğrulama bağlantısı gönderir. */
export async function sendVerificationEmail(
  email: string,
  fullName: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (isEmailEnabled()) {
    const { data, error } = await supabaseAdmin().auth.admin.generateLink({ type: "magiclink", email })
    if (error || !data.properties?.hashed_token) {
      console.error("generateLink(magiclink) hatası:", error)
      return { ok: false, error: "Doğrulama bağlantısı oluşturulamadı." }
    }
    const url = callbackUrl({ token_hash: data.properties.hashed_token, type: "magiclink", next: AFTER_VERIFY_PATH })
    return sendEmail(verifyEmailTemplate(email, fullName, url))
  }

  // Yedek: Supabase'in magic link e-postası (doğrulanınca e-posta onaylanır).
  const { error } = await anonClient().auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: callbackUrl({ next: AFTER_VERIFY_PATH }) },
  })
  if (error) {
    console.error("signInWithOtp hatası:", error)
    return { ok: false, error: "Doğrulama e-postası gönderilemedi. Biraz sonra tekrar dene." }
  }
  return { ok: true }
}

/** Şifre sıfırlama bağlantısı. Kayıtlı olmayan e-postada sessizce başarı döner. */
export async function sendPasswordResetEmail(email: string): Promise<void> {
  if (isEmailEnabled()) {
    const { data, error } = await supabaseAdmin().auth.admin.generateLink({ type: "recovery", email })
    if (error || !data.properties?.hashed_token) {
      // Kayıtlı olmayan e-posta da buraya düşer — e-posta numaralandırmayı önlemek için sessiz.
      if (error) console.error("generateLink(recovery):", error.message)
      return
    }
    const url = callbackUrl({ token_hash: data.properties.hashed_token, type: "recovery" })
    await sendEmail(passwordResetTemplate(email, url))
    return
  }

  const { error } = await anonClient().auth.resetPasswordForEmail(email, {
    redirectTo: `${getSiteUrl()}/auth/callback`,
  })
  if (error) console.error("resetPasswordForEmail:", error)
}
