// Cloudflare Turnstile — sunucu doğrulaması.
// TURNSTILE_SITE_KEY / TURNSTILE_SECRET yoksa koruma KAPALI çalışır (her istek geçer).

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

export const TURNSTILE_FIELD = "cf-turnstile-response"
export const TURNSTILE_ERROR = "Güvenlik doğrulaması başarısız. Sayfayı yenileyip tekrar dene."

export function turnstileSiteKey(): string | null {
  return process.env.TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET
    ? process.env.TURNSTILE_SITE_KEY
    : null
}

export function isTurnstileEnabled(): boolean {
  return turnstileSiteKey() !== null
}

export async function verifyTurnstile(token: FormDataEntryValue | null, ip?: string): Promise<boolean> {
  if (!isTurnstileEnabled()) return true
  if (typeof token !== "string" || token.length === 0) return false

  const body = new URLSearchParams({ secret: process.env.TURNSTILE_SECRET!, response: token })
  if (ip && ip !== "unknown") body.set("remoteip", ip)

  try {
    const res = await fetch(VERIFY_URL, { method: "POST", body })
    const json: unknown = await res.json()
    return typeof json === "object" && json !== null && (json as { success?: unknown }).success === true
  } catch (err) {
    console.error("Turnstile doğrulama hatası:", err)
    return false
  }
}
