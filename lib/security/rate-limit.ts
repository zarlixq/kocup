import { createHash } from "crypto"
import { headers } from "next/headers"
import { supabaseAdmin } from "@/lib/supabase/admin"

// Kayıt/giriş kötüye kullanım koruması. Sayaç DB'de (public.rate_limits,
// yalnız service role) → sunucusuz ortamda örnekler arası ortak.
// Anahtarlar hash'lenir; IP/e-posta düz metin saklanmaz.

export const RATE_LIMITS = {
  signupIp: { limit: 5, windowSeconds: 60 * 60 },
  loginIp: { limit: 30, windowSeconds: 15 * 60 },
  loginEmail: { limit: 10, windowSeconds: 15 * 60 },
  resendEmail: { limit: 3, windowSeconds: 15 * 60 },
  passwordResetIp: { limit: 5, windowSeconds: 15 * 60 },
  inviteAcceptIp: { limit: 20, windowSeconds: 15 * 60 },
  feedbackUser: { limit: 10, windowSeconds: 60 * 60 },
} as const

export type RateLimitBucket = keyof typeof RATE_LIMITS

export const RATE_LIMIT_MESSAGE = "Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar dene."

function hashKey(key: string): string {
  return createHash("sha256").update(key.trim().toLowerCase()).digest("hex")
}

/** İstek IP'si (Vercel: x-forwarded-for ilk değer). Bulunamazsa "unknown". */
export async function getClientIp(): Promise<string> {
  const h = await headers()
  const fwd = h.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0]!.trim()
  return h.get("x-real-ip") ?? "unknown"
}

/**
 * true → izin ver. DB hatasında (ör. bağlantı) kullanıcıyı kilitlememek için
 * izin verir ve loglar.
 */
export async function checkRateLimit(bucket: RateLimitBucket, key: string): Promise<boolean> {
  const { limit, windowSeconds } = RATE_LIMITS[bucket]
  const { data, error } = await supabaseAdmin().rpc("check_rate_limit", {
    p_bucket: bucket,
    p_key_hash: hashKey(key),
    p_limit: limit,
    p_window_seconds: windowSeconds,
  })
  if (error) {
    console.error("checkRateLimit hatası:", error)
    return true
  }
  return data === true
}
