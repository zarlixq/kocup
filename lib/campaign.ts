// Kampanya modu (ana sayfa hero'su + mobil sabit "Ücretsiz başla" butonu).
// Tarihler Europe/Istanbul (UTC+3, yaz saati yok) ofsetiyle yazılır. Bitiş anından
// sonra ana sayfa kendiliğinden normal hâline döner: ana sayfa ISR ile en geç
// 5 dakikada yeniden üretilir (app/(public)/page.tsx revalidate), deploy gerekmez.

export type CampaignConfig = {
  active: boolean
  /** Dahil — ISO, +03:00 ofsetli. */
  startsAt: string
  /** Hariç — ISO, +03:00 ofsetli. */
  endsAt: string
}

export const CAMPAIGN: CampaignConfig = {
  active: true,
  startsAt: "2026-10-22T00:00:00+03:00",
  endsAt: "2026-10-25T00:00:00+03:00",
}

export function isCampaignActive(now: Date = new Date(), config: CampaignConfig = CAMPAIGN): boolean {
  if (!config.active) return false
  const t = now.getTime()
  return t >= new Date(config.startsAt).getTime() && t < new Date(config.endsAt).getTime()
}

export const FREE_SIGNUP_PATH = "/ucretsiz"
