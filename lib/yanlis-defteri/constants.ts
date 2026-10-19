// Yanlış defteri sabitleri — hata tipleri, renkler, güven seviyeleri.
// DB CHECK'leri ile birebir (migration 203 / 205).

export const ERROR_TYPES = [
  "bilgi_eksik",
  "islem_hatasi",
  "dikkat_okuma",
  "sure_yetmedi",
  "hic_fikrim_yok",
] as const

export type ErrorType = (typeof ERROR_TYPES)[number]

export const ERROR_TYPE_LABEL: Record<ErrorType, string> = {
  bilgi_eksik: "Bilgi eksikliği",
  islem_hatasi: "İşlem hatası",
  dikkat_okuma: "Dikkat / okuma",
  sure_yetmedi: "Süre yetmedi",
  hic_fikrim_yok: "Hiç fikrim yok",
}

// Panel butonlarındaki kısa açıklama (öğrencinin kendi diliyle).
export const ERROR_TYPE_HINT: Record<ErrorType, string> = {
  bilgi_eksik: "Konuyu / formülü bilmiyordum",
  islem_hatasi: "Biliyordum, hesapta hata yaptım",
  dikkat_okuma: "Soruyu yanlış okudum, dikkatsizlik",
  sure_yetmedi: "Yetiştiremedim",
  hic_fikrim_yok: "Nereden başlayacağımı bilemedim",
}

// Kategorik palet — dataviz validatöründen geçti (açık zemin, komşu çiftler
// CVD ΔE ≥ 9). Sıra sabittir, filtre değişse de renk tipe bağlı kalır.
// Kontrast < 3:1 olan tonlar (yeşil, sarı) için her grafikte lejant + sayı var.
export const ERROR_TYPE_COLOR: Record<ErrorType, string> = {
  bilgi_eksik: "#eb6834",
  islem_hatasi: "#2a78d6",
  dikkat_okuma: "#1baf7a",
  sure_yetmedi: "#eda100",
  hic_fikrim_yok: "#6250d6",
}

/** "Bilmiyordum" sayılan tipler: Kademe 2'de atom sorulur. */
export const UNKNOWN_TYPES: readonly ErrorType[] = ["bilgi_eksik", "hic_fikrim_yok"]

export function isErrorType(v: string | null): v is ErrorType {
  return v !== null && (ERROR_TYPES as readonly string[]).includes(v)
}

// Deneme yanlışında hata tipi opsiyonel (wrong_answers.error_type null, migration 208).
export const UNTYPED_LABEL = "Belirtilmedi"
export const UNTYPED_COLOR = "#a1a1aa"

export function errorTypeLabel(t: ErrorType | null): string {
  return t ? ERROR_TYPE_LABEL[t] : UNTYPED_LABEL
}

export function errorTypeColor(t: ErrorType | null): string {
  return t ? ERROR_TYPE_COLOR[t] : UNTYPED_COLOR
}

export type Confidence = "yetersiz" | "dusuk" | "orta" | "yuksek"

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  yetersiz: "Yetersiz veri",
  dusuk: "Düşük güven",
  orta: "Orta güven",
  yuksek: "Yüksek güven",
}

export const CONFIDENCE_TONE: Record<Confidence, string> = {
  yetersiz: "bg-zinc-100 text-zinc-500",
  dusuk: "bg-amber-50 text-amber-700",
  orta: "bg-sky-50 text-sky-700",
  yuksek: "bg-emerald-50 text-emerald-700",
}

// SQL'deki (student_gap_map, migration 205) eşiklerle aynı — panelde kayıt
// öncesi güven metnini göstermek için istemcide de gerekir.
// Değiştirirsen 205'teki CASE'i de değiştir.
export const CONFIDENCE_THRESHOLDS = { dusuk: 20, orta: 50, yuksek: 150 } as const

export function confidenceFor(topicQuestions: number): Confidence {
  if (topicQuestions < CONFIDENCE_THRESHOLDS.dusuk) return "yetersiz"
  if (topicQuestions < CONFIDENCE_THRESHOLDS.orta) return "dusuk"
  if (topicQuestions < CONFIDENCE_THRESHOLDS.yuksek) return "orta"
  return "yuksek"
}

export function isConfidence(v: string): v is Confidence {
  return v === "yetersiz" || v === "dusuk" || v === "orta" || v === "yuksek"
}

export const ATOM_TYPE_LABEL: Record<string, string> = {
  formul: "Formül",
  kural: "Kural",
  kavram: "Kavram",
  yontem: "Yöntem",
}

/** Kademe 2'de ilk gösterilen atom chip sayısı. */
export const ATOM_CHIP_LIMIT = 8
