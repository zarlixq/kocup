"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { googleCompleteSchema, gradeFromDurum } from "@/lib/bireysel/schemas"
import { provisionStudent } from "@/lib/bireysel/accounts"
import { UTM_KEYS } from "@/lib/analytics/utm"
import { isGoogleUser } from "@/lib/auth/oauth"
import { checkRateLimit, getClientIp, RATE_LIMIT_MESSAGE } from "@/lib/security/rate-limit"

export type CompleteState = { success: false; error: string; field?: string } | undefined

const FIELDS = ["durum", "alan", ...UTM_KEYS, "is_minor", "accept_terms", "accept_kvkk", "accept_parent"] as const

/** Google ile gelen, profili olmayan kullanıcı için öğrenci hesabı (rol her zaman 'student'). */
export async function completeGoogleSignupAction(_prev: CompleteState, formData: FormData): Promise<CompleteState> {
  const parsed = googleCompleteSchema.safeParse(Object.fromEntries(FIELDS.map((f) => [f, formData.get(f)])))
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return { success: false, error: issue?.message ?? "Form hatalı.", field: issue?.path[0]?.toString() }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email || !isGoogleUser(user)) return { success: false, error: "Oturum bulunamadı. Tekrar Google ile giriş yap." }

  const ip = await getClientIp()
  if (!(await checkRateLimit("signupIp", ip))) return { success: false, error: RATE_LIMIT_MESSAGE }

  const admin = supabaseAdmin()
  const { data: existing } = await admin.from("profiles").select("id").eq("id", user.id).maybeSingle()
  if (existing) redirect("/ogrenci")

  const d = parsed.data
  const meta = user.user_metadata as { full_name?: unknown; name?: unknown }
  const metaName = typeof meta.full_name === "string" ? meta.full_name : typeof meta.name === "string" ? meta.name : ""
  const fullName = metaName.trim().slice(0, 120) || user.email.split("@")[0]!

  const res = await provisionStudent(admin, {
    userId: user.id,
    email: user.email,
    fullName,
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
      signup_method: "google",
      // Google e-postayı doğrulamış olarak verir.
      email_verified_at: new Date().toISOString(),
    },
  })
  if (!res.ok) return { success: false, error: res.error }

  redirect("/ogrenci/upplan/kurulum?kayit=1")
}
