"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { acceptInviteSchema } from "@/lib/bireysel/schemas"
import { acceptInvitation } from "@/lib/invitations/service"
import { AFTER_VERIFY_PATH } from "@/lib/auth/email-links"
import { checkRateLimit, getClientIp, RATE_LIMIT_MESSAGE } from "@/lib/security/rate-limit"
import { TURNSTILE_ERROR, TURNSTILE_FIELD, verifyTurnstile } from "@/lib/security/turnstile"

export type AcceptState = { success: false; error: string; field?: string } | undefined

export async function acceptInvitationAction(_prev: AcceptState, formData: FormData): Promise<AcceptState> {
  const parsed = acceptInviteSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    password_confirm: formData.get("password_confirm"),
    is_minor: formData.get("is_minor"),
    accept_terms: formData.get("accept_terms"),
    accept_kvkk: formData.get("accept_kvkk"),
    accept_parent: formData.get("accept_parent"),
  })
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return { success: false, error: issue?.message ?? "Form hatalı.", field: issue?.path[0]?.toString() }
  }

  const ip = await getClientIp()
  if (!(await checkRateLimit("inviteAcceptIp", ip))) return { success: false, error: RATE_LIMIT_MESSAGE }
  if (!(await verifyTurnstile(formData.get(TURNSTILE_FIELD), ip))) return { success: false, error: TURNSTILE_ERROR }

  let destination = "/ogrenci"
  try {
    const res = await acceptInvitation(supabaseAdmin(), {
      token: parsed.data.token,
      password: parsed.data.password,
      isMinor: parsed.data.is_minor === "evet",
    })
    if (!res.ok) return { success: false, error: res.error }

    // Hesap oluştu → oturum aç (davet bağlantısı e-postayı doğrulamış sayılır).
    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({ email: res.email, password: parsed.data.password })
    if (error) {
      console.error("Davet sonrası giriş:", error)
      return { success: false, error: "Hesabın oluşturuldu. Giriş sayfasından belirlediğin şifreyle giriş yapabilirsin." }
    }
    destination = res.individual ? AFTER_VERIFY_PATH : "/ogrenci"
  } catch (err) {
    console.error("acceptInvitationAction:", err)
    return { success: false, error: "Bir hata oluştu, tekrar deneyin." }
  }

  redirect(destination)
}
