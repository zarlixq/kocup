import type { Database } from "@/lib/database.types"

export type SalesLead = Database["public"]["Tables"]["sales_leads"]["Row"]

export const KURUM_TIPI_VALUES = [
  "dershane",
  "ozel_okul",
  "bireysel_koc",
  "diger",
] as const

export type KurumTipi = (typeof KURUM_TIPI_VALUES)[number]

export const KURUM_TIPI_OPTIONS: { value: KurumTipi; label: string }[] = [
  { value: "dershane", label: "Dershane" },
  { value: "ozel_okul", label: "Özel Okul" },
  { value: "bireysel_koc", label: "Bireysel Koç" },
  { value: "diger", label: "Diğer" },
]

export const KURUM_TIPI_LABEL: Record<KurumTipi, string> = {
  dershane: "Dershane",
  ozel_okul: "Özel Okul",
  bireysel_koc: "Bireysel Koç",
  diger: "Diğer",
}

export const DURUM_VALUES = [
  "iletisim_kurulmadi",
  "ilk_ziyaret",
  "numara_alindi",
  "demo_ayarlandi",
  "teklif_verildi",
  "muzakere",
  "kazanildi",
  "kaybedildi",
  "beklemede",
] as const

export type Durum = (typeof DURUM_VALUES)[number]

export const DURUM_OPTIONS: { value: Durum; label: string }[] = [
  { value: "iletisim_kurulmadi", label: "İletişim Kurulmadı" },
  { value: "ilk_ziyaret", label: "İlk Ziyaret" },
  { value: "numara_alindi", label: "Numara Alındı" },
  { value: "demo_ayarlandi", label: "Demo Ayarlandı" },
  { value: "teklif_verildi", label: "Teklif Verildi" },
  { value: "muzakere", label: "Müzakere" },
  { value: "kazanildi", label: "Kazanıldı" },
  { value: "kaybedildi", label: "Kaybedildi" },
  { value: "beklemede", label: "Beklemede" },
]

export const DURUM_LABEL: Record<Durum, string> = DURUM_OPTIONS.reduce(
  (acc, o) => {
    acc[o.value] = o.label
    return acc
  },
  {} as Record<Durum, string>,
)

// Her durum için rozet renk sınıfları (bg + text + border).
export const DURUM_COLORS: Record<Durum, string> = {
  iletisim_kurulmadi: "bg-zinc-100 text-zinc-700 border-zinc-200",
  ilk_ziyaret: "bg-sky-100 text-sky-800 border-sky-200",
  numara_alindi: "bg-blue-100 text-blue-800 border-blue-200",
  demo_ayarlandi: "bg-indigo-100 text-indigo-800 border-indigo-200",
  teklif_verildi: "bg-orange-100 text-orange-800 border-orange-200",
  muzakere: "bg-amber-100 text-amber-800 border-amber-200",
  kazanildi: "bg-green-100 text-green-800 border-green-200",
  kaybedildi: "bg-red-100 text-red-800 border-red-200",
  beklemede: "bg-purple-100 text-purple-800 border-purple-200",
}

// Funnel özetinde öne çıkarılan durumlar (sıralı).
export const FUNNEL_DURUMLAR: Durum[] = [
  "ilk_ziyaret",
  "demo_ayarlandi",
  "teklif_verildi",
  "muzakere",
  "kazanildi",
]

// Kapalı sayılan durumlar — "takip edilmesi gerekenler" bunları hariç tutar.
export const KAPALI_DURUMLAR: Durum[] = ["kazanildi", "kaybedildi"]
