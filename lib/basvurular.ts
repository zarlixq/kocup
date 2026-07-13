import type { Tables } from "@/lib/database.types"

// ── Tipler ────────────────────────────────────────────────────────────────
export type KurumBasvuru = Tables<"institution_inquiries">
export type KocBasvuru = Tables<"koc_applications">

// ── Kurum (demo/institution) durumları ──────────────────────────────────────
export const KURUM_STATUS_VALUES = ["yeni", "incelendi", "gorusuldu", "kapandi"] as const
export type KurumStatus = (typeof KURUM_STATUS_VALUES)[number]

export const KURUM_STATUS_OPTIONS: { value: KurumStatus; label: string }[] = [
  { value: "yeni", label: "Yeni" },
  { value: "incelendi", label: "İncelendi" },
  { value: "gorusuldu", label: "Görüşüldü" },
  { value: "kapandi", label: "Kapandı" },
]

export const KURUM_STATUS_COLORS: Record<KurumStatus, string> = {
  yeni: "bg-orange-100 text-orange-800 border-orange-200",
  incelendi: "bg-sky-100 text-sky-800 border-sky-200",
  gorusuldu: "bg-indigo-100 text-indigo-800 border-indigo-200",
  kapandi: "bg-zinc-100 text-zinc-600 border-zinc-200",
}

// ── Koç & Öğrenci başvuru durumları (ortak) ────────────────────────────────
export const BASVURU_STATUS_VALUES = [
  "yeni",
  "degerlendirmede",
  "onaylandi",
  "reddedildi",
] as const
export type BasvuruStatus = (typeof BASVURU_STATUS_VALUES)[number]

export const BASVURU_STATUS_OPTIONS: { value: BasvuruStatus; label: string }[] = [
  { value: "yeni", label: "Yeni" },
  { value: "degerlendirmede", label: "Değerlendirmede" },
  { value: "onaylandi", label: "Onaylandı" },
  { value: "reddedildi", label: "Reddedildi" },
]

export const BASVURU_STATUS_COLORS: Record<BasvuruStatus, string> = {
  yeni: "bg-orange-100 text-orange-800 border-orange-200",
  degerlendirmede: "bg-amber-100 text-amber-800 border-amber-200",
  onaylandi: "bg-green-100 text-green-800 border-green-200",
  reddedildi: "bg-red-100 text-red-800 border-red-200",
}

// Panel sekme anahtarları
export const BASVURU_KINDS = ["kurum", "koc"] as const
export type BasvuruKind = (typeof BASVURU_KINDS)[number]
