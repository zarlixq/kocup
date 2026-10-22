// UTM parametreleri — reklam linkinden gelen kaynak bilgisi (client-safe).

export const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const
export type UtmKey = (typeof UTM_KEYS)[number]
export type Utm = Record<UtmKey, string | null>

/** "?utm_source=meta&..." → { utm_source: "meta", ... } (boşlar null, en fazla 100 karakter). */
export function parseUtm(search: string): Utm {
  const params = new URLSearchParams(search)
  const out = {} as Utm
  for (const key of UTM_KEYS) {
    const v = params.get(key)?.trim()
    out[key] = v ? v.slice(0, 100) : null
  }
  return out
}

export function hasUtm(utm: Utm): boolean {
  return UTM_KEYS.some((k) => utm[k] !== null)
}

// Reklamdan ana sayfaya gelip "Ücretsiz başla"ya tıklayan ziyaretçide UTM kaybolmasın:
// ilk UTM'li girişte birinci taraf çerezde 30 gün saklanır (kişisel veri değil).
const UTM_COOKIE = "kup_utm"

export function rememberUtm(utm: Utm): void {
  if (typeof document === "undefined" || !hasUtm(utm)) return
  document.cookie = `${UTM_COOKIE}=${encodeURIComponent(JSON.stringify(utm))}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`
}

function storedUtm(): Utm | null {
  if (typeof document === "undefined") return null
  const m = document.cookie.match(new RegExp(`(?:^|; )${UTM_COOKIE}=([^;]*)`))
  if (!m) return null
  try {
    const raw: unknown = JSON.parse(decodeURIComponent(m[1]!))
    if (typeof raw !== "object" || raw === null) return null
    const rec = raw as Record<string, unknown>
    const out = {} as Utm
    for (const k of UTM_KEYS) out[k] = typeof rec[k] === "string" && rec[k] ? (rec[k] as string).slice(0, 100) : null
    return hasUtm(out) ? out : null
  } catch {
    return null
  }
}

/** Adres çubuğundaki UTM; yoksa daha önce saklanan. */
export function currentUtm(): Utm {
  const fromUrl = parseUtm(typeof window === "undefined" ? "" : window.location.search)
  if (hasUtm(fromUrl)) return fromUrl
  return storedUtm() ?? fromUrl
}
