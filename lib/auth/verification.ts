import { supabaseAdmin } from "@/lib/supabase/admin"

// Bireysel öğrencinin e-posta doğrulaması (migration 226).
// Supabase hesabı ücretsiz kayıtta onaylı oluşturulur; "doğruladı mı" bilgisi
// student_acquisition.email_verified_at'tedir. REQUIRE_EMAIL_VERIFICATION=true
// iken doğrulanmamış öğrenci giriş yapamaz (eski zorunlu akış).

/** true → eski zorunlu doğrulama akışı. Varsayılan false (yumuşak doğrulama). */
export function requireEmailVerification(): boolean {
  return process.env.REQUIRE_EMAIL_VERIFICATION === "true"
}

/**
 * Geliş kaydı olan (bireysel) öğrenci doğrulanmamışsa true. Geliş kaydı yoksa
 * (kurum/koç öğrencisi) doğrulama bu akışın konusu değil → false.
 */
export async function isUnverifiedIndividual(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin()
    .from("student_acquisition")
    .select("email_verified_at")
    .eq("student_id", userId)
    .maybeSingle()
  return !!data && data.email_verified_at === null
}

/** E-postadaki bağlantıyla (doğrulama / şifre sıfırlama) giriş = e-posta sahipliği kanıtı. */
export async function markEmailVerified(userId: string): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("student_acquisition")
    .update({ email_verified_at: new Date().toISOString() })
    .eq("student_id", userId)
    .is("email_verified_at", null)
  if (error) console.error("markEmailVerified:", error)
}
