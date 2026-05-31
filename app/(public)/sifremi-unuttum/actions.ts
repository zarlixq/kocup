"use server"

import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { getSiteUrl } from "@/lib/site-url"

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

  const supabase = await createClient()
  const siteUrl = getSiteUrl()

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl}/auth/callback`,
  })

  // Email enumeration'ı önlemek için, kayıtlı olmayan email'de bile başarı dön.
  // Supabase tarafı zaten rate limit uyguluyor.
  if (error) {
    console.error("resetPasswordForEmail:", error)
  }

  return { success: true, email: parsed.data.email }
}
