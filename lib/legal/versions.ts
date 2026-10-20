// Yasal metin versiyonları — onay kayıtlarına (user_consents.version) yazılır.
// Metin değiştiğinde ilgili versiyonu ve LEGAL_UPDATED tarihini güncelle.

export const LEGAL_UPDATED = "20.10.2026"

export const LEGAL_VERSIONS = {
  kullanim_sartlari: "2026-10-20",
  gizlilik: "2026-10-20",
  kvkk_aydinlatma: "2026-10-20",
  veli_bilgisi: "2026-10-20",
} as const

export type ConsentType = keyof typeof LEGAL_VERSIONS

export const LEGAL_LINKS = [
  { href: "/gizlilik", label: "Gizlilik Politikası" },
  { href: "/kvkk-aydinlatma", label: "KVKK Aydınlatma Metni" },
  { href: "/kullanim-sartlari", label: "Kullanım Şartları" },
  { href: "/cerez-politikasi", label: "Çerez Politikası" },
] as const

export const CONTACT_EMAIL = "kocupkocluk@gmail.com"
