"use server"

import { createClient } from "@/lib/supabase/server"
import { sendVerificationEmail } from "@/lib/auth/email-links"
import { checkRateLimit, RATE_LIMIT_MESSAGE } from "@/lib/security/rate-limit"

type Result = { success: boolean; error?: string }

/** Paneldeki bant: oturumdaki öğrenciye doğrulama e-postası (e-posta başına 15 dk'da 3). */
export async function sendMyVerificationEmail(): Promise<Result> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user?.email) return { success: false, error: "Oturum bulunamadı." }

    const [{ data: acq }, { data: profile }] = await Promise.all([
      supabase.from("student_acquisition").select("email_verified_at").eq("student_id", user.id).maybeSingle(),
      supabase.from("profiles").select("full_name, role").eq("id", user.id).maybeSingle(),
    ])
    if (profile?.role !== "student" || !acq) return { success: false, error: "Yetkisiz işlem." }
    if (acq.email_verified_at) return { success: true }

    if (!(await checkRateLimit("resendEmail", user.email))) return { success: false, error: RATE_LIMIT_MESSAGE }

    const sent = await sendVerificationEmail(user.email, profile.full_name.split(" ")[0] ?? profile.full_name)
    if (!sent.ok) return { success: false, error: sent.error }
    return { success: true }
  } catch (err) {
    console.error("sendMyVerificationEmail:", err)
    return { success: false, error: "Bir hata oluştu, tekrar deneyin." }
  }
}
