// Supabase Auth'ta Google sağlayıcısı açık mı? Herkese açık /auth/v1/settings
// uç noktası (anon key) okunur; sonuç 10 dk önbellekte. Hata → kapalı say
// (buton gizlenir, e-posta ile kayıt her zaman çalışır).

export async function isGoogleAuthEnabled(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return false
  try {
    const res = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key },
      next: { revalidate: 600 },
    })
    if (!res.ok) return false
    const json: unknown = await res.json()
    if (typeof json !== "object" || json === null) return false
    const external = (json as { external?: unknown }).external
    return typeof external === "object" && external !== null && (external as { google?: unknown }).google === true
  } catch {
    return false
  }
}

/** Oturum Google kimliğiyle mi açıldı (app_metadata sunucu tarafında yazılır, istemci değiştiremez). */
export function isGoogleUser(user: { app_metadata?: { provider?: unknown; providers?: unknown } }): boolean {
  const providers: unknown[] = Array.isArray(user.app_metadata?.providers) ? user.app_metadata.providers : []
  return user.app_metadata?.provider === "google" || providers.includes("google")
}
