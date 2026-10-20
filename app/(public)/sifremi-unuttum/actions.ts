"use server"

import { z } from "zod"
import { sendPasswordResetEmail } from "@/lib/auth/email-links"
import { checkRateLimit, getClientIp, RATE_LIMIT_MESSAGE } from "@/lib/security/rate-limit"

const schema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi girin."),
})

export type ResetState =
  | { success: true; email: string }
  | { success: false; error: string }
  | undefined

export async function requestPasswordReset(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const parsed = schema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
  })

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Geçersiz form." }
  }

  if (!(await checkRateLimit("passwordResetIp", await getClientIp()))) {
    return { success: false, error: RATE_LIMIT_MESSAGE }
  }

  // Email enumeration'ı önlemek için, kayıtlı olmayan email'de bile başarı dön.
  // Resend varsa KoçUp markalı e-posta, yoksa Supabase'in kendi e-postası.
  await sendPasswordResetEmail(parsed.data.email)

  return { success: true, email: parsed.data.email }
}
