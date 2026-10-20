"use server"

import { redirect } from "next/navigation"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { signupSchema } from "@/lib/bireysel/schemas"
import { createStudentAccount } from "@/lib/bireysel/accounts"
import { sendVerificationEmail } from "@/lib/auth/email-links"
import { checkRateLimit, getClientIp, RATE_LIMIT_MESSAGE } from "@/lib/security/rate-limit"
import { TURNSTILE_ERROR, TURNSTILE_FIELD, verifyTurnstile } from "@/lib/security/turnstile"

export type SignupState =
  | { success: false; error: string; field?: string; values?: { full_name: string; email: string } }
  | undefined

const FIELDS = [
  "full_name", "email", "password", "status", "grade", "alan",
  "utm_source", "utm_medium", "utm_campaign",
  "is_minor", "accept_terms", "accept_kvkk", "accept_parent",
] as const

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
  try {
    const res = await createStudentAccount(supabaseAdmin(), {
      email: d.email,
      password: d.password,
      fullName: d.full_name,
      emailConfirmed: false,
      grade: d.status === "mezun" ? "Mezun" : d.grade,
      acquisition: {
        source: "ucretsiz_kayit",
        segment: "yks",
        alan: d.alan,
        is_minor: d.is_minor === "evet",
        utm_source: d.utm_source,
        utm_medium: d.utm_medium,
        utm_campaign: d.utm_campaign,
      },
    })
    if (!res.ok) {
      return { success: false, error: res.error, field: res.code === "email_exists" ? "email" : undefined, values }
    }

    const sent = await sendVerificationEmail(d.email, d.full_name.split(" ")[0] ?? d.full_name)
    if (!sent.ok) console.error("Doğrulama e-postası gönderilemedi:", sent.error)
  } catch (err) {
    console.error("signupAction:", err)
    return { success: false, error: "Bir hata oluştu, tekrar deneyin.", values }
  }

  redirect(`/ucretsiz-basla/dogrula?email=${encodeURIComponent(d.email)}`)
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

  const { data: authUser } = await admin.auth.admin.getUserById(profile.id)
  if (!authUser.user || authUser.user.email_confirmed_at) return generic

  const sent = await sendVerificationEmail(email, profile.full_name.split(" ")[0] ?? profile.full_name)
  if (!sent.ok) return { success: false, message: sent.error }
  return generic
}
