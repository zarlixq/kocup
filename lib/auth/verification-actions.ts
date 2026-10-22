"use server"

import { createClient } from "@/lib/supabase/server"
import { markEmailVerified } from "@/lib/auth/verification"

// E-posta bağlantısıyla (implicit akış, /auth/callback/client) açılan oturumda
// doğrulamayı işaretler. Yalnız doğrulanmış JWT'nin amr'ı bir e-posta bağlantısı
// girişini gösteriyorsa çalışır — şifreyle açılmış oturum kendini doğrulayamaz.

const EMAIL_LINK_METHODS = new Set(["otp", "magiclink", "recovery", "invite", "email/signup", "email_change"])

export async function markVerifiedFromEmailLink(): Promise<void> {
  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getClaims()
    const claims = data?.claims
    if (!claims?.sub) return
    const amr = Array.isArray(claims.amr) ? claims.amr : []
    const viaEmailLink = amr.some((e) => {
      const method = typeof e === "string" ? e : e.method
      return EMAIL_LINK_METHODS.has(method)
    })
    if (viaEmailLink) await markEmailVerified(claims.sub)
  } catch (err) {
    console.error("markVerifiedFromEmailLink:", err)
  }
}
