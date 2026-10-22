"use server"

import { after } from "next/server"
import { redirect } from "next/navigation"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { gradeFromDurum, signupSchema } from "@/lib/bireysel/schemas"
import { createStudentAccount } from "@/lib/bireysel/accounts"
import { sendVerificationEmail } from "@/lib/auth/email-links"
import { requireEmailVerification } from "@/lib/auth/verification"
import { UTM_KEYS } from "@/lib/analytics/utm"
import { checkRateLimit, getClientIp, RATE_LIMIT_MESSAGE } from "@/lib/security/rate-limit"
import { TURNSTILE_ERROR, TURNSTILE_FIELD, verifyTurnstile } from "@/lib/security/turnstile"

export type SignupState =
  | { success: false; error: string; field?: string; values?: { full_name: string; email: string } }
  | undefined

const FIELDS = [
  "full_name", "email", "password", "durum", "alan", ...UTM_KEYS,
  "is_minor", "accept_terms", "accept_kvkk", "accept_parent",
] as const

/** Kayıt sonrası ilk sayfa; ?kayit=1 dönüşüm olayını (CompleteRegistration) tetikler. */
const AFTER_SIGNUP_PATH = "/ogrenci/upplan/kurulum?kayit=1"

export async function signupAction(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const raw = Object.fromEntries(FIELDS.map((f) => [f, formData.get(f)]))
  // React form action'ı gönderimde formu sıfırlar; hata halinde metin alanlarını geri ver.
  const values = { full_name: String(raw.full_name ?? ""), email: String(raw.email ?? "") }
  const parsed = signupSchema.safeParse(raw)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return { success: false, error: issue?.message ?? "Form hatalı.", field: issue?.path[0]?.toString(), values }
  }

  const ip = await getClientIp()
  if (!(await checkRateLimit("signupIp", ip))) return { success: false, error: RATE_LIMIT_MESSAGE, values }
  if (!(await verifyTurnstile(formData.get(TURNSTILE_FIELD), ip))) {
    return { success: false, error: TURNSTILE_ERROR, values }
  }

  const d = parsed.data
  const strict = requireEmailVerification()
  const firstName = d.full_name.split(" ")[0] ?? d.full_name
  let signedIn = false
  try {
    // Supabase hesabı onaylı açılır; doğrulama durumu student_acquisition.email_verified_at'te
    // (zorunlu modda giriş bu kolona göre engellenir — lib/auth/verification.ts).
    const res = await createStudentAccount(supabaseAdmin(), {
      email: d.email,
      password: d.password,
      fullName: d.full_name,
      emailConfirmed: true,
      grade: gradeFromDurum(d.durum),
      acquisition: {
        source: "ucretsiz_kayit",
        segment: "yks",
        alan: d.alan,
        is_minor: d.is_minor === "evet",
        utm_source: d.utm_source,
        utm_medium: d.utm_medium,
        utm_campaign: d.utm_campaign,
        utm_content: d.utm_content,
        signup_method: "email",
        email_verified_at: null,
      },
    })
    if (!res.ok) {
      return { success: false, error: res.error, field: res.code === "email_exists" ? "email" : undefined, values }
    }

    if (strict) {
      const sent = await sendVerificationEmail(d.email, firstName)
      if (!sent.ok) console.error("Doğrulama e-postası gönderilemedi:", sent.error)
    } else {
      // Yumuşak doğrulama: oturumu hemen aç, doğrulama e-postası yanıttan sonra gitsin.
      const supabase = await createClient()
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: d.email, password: d.password })
      if (signInErr) console.error("signupAction signIn:", signInErr)
      signedIn = !signInErr
      after(async () => {
        const sent = await sendVerificationEmail(d.email, firstName)
        if (!sent.ok) console.error("Doğrulama e-postası gönderilemedi:", sent.error)
      })
    }
  } catch (err) {
    console.error("signupAction:", err)
    return { success: false, error: "Bir hata oluştu, tekrar deneyin.", values }
  }

  if (strict) redirect(`/ucretsiz/dogrula?email=${encodeURIComponent(d.email)}&kayit=1`)
  // Oturum açılamadıysa (beklenmez) hesap hazır; girişe yönlendir.
  redirect(signedIn ? AFTER_SIGNUP_PATH : "/giris/ogrenci")
}

export type ResendState = { success: boolean; message: string } | undefined

/** Doğrulama e-postasını tekrar gönder. Hesap yok/doğrulanmışsa da aynı mesaj (numaralandırma yok). */
export async function resendVerificationAction(_prev: ResendState, formData: FormData): Promise<ResendState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  const generic = { success: true, message: "Hesabın varsa ve doğrulanmamışsa yeni bağlantı gönderildi." }
  if (!email.includes("@")) return { success: false, message: "Geçerli bir e-posta gir." }

  const ip = await getClientIp()
  const [ipOk, emailOk] = await Promise.all([checkRateLimit("loginIp", ip), checkRateLimit("resendEmail", email)])
  if (!ipOk || !emailOk) return { success: false, message: RATE_LIMIT_MESSAGE }

  const admin = supabaseAdmin()
  const { data: profile } = await admin
    .from("profiles")
    .select("id, full_name, role")
    .eq("email", email)
    .maybeSingle()
  if (!profile || profile.role !== "student") return generic

  const { data: acq } = await admin
    .from("student_acquisition")
    .select("email_verified_at")
    .eq("student_id", profile.id)
    .maybeSingle()
  if (!acq || acq.email_verified_at) return generic

  const sent = await sendVerificationEmail(email, profile.full_name.split(" ")[0] ?? profile.full_name)
  if (!sent.ok) return { success: false, message: sent.error }
  return generic
}
