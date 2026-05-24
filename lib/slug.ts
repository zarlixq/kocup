const TR_MAP: Record<string, string> = {
  ı: "i", İ: "i", ş: "s", Ş: "s",
  ğ: "g", Ğ: "g", ü: "u", Ü: "u",
  ö: "o", Ö: "o", ç: "c", Ç: "c",
}

/**
 * Türkçe karakterleri ASCII'ye çevirip URL-friendly slug üretir.
 * Örn: "Eğitim Koçluğu Nedir?" → "egitim-koclugu-nedir"
 */
export function slugify(text: string): string {
  if (!text) return ""
  return text
    .split("")
    .map((c) => TR_MAP[c] ?? c)
    .join("")
    .toLowerCase()
    .replace(/\p{Mn}/gu, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
}
