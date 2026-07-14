import type { Database } from "@/lib/database.types"

export type SalesLead = Database["public"]["Tables"]["sales_leads"]["Row"]
export type DemoAppointment = Database["public"]["Tables"]["demo_appointments"]["Row"]
export type DemoSetter = Database["public"]["Tables"]["demo_setters"]["Row"]

// Randevu + gömülü "ayarlayan" adı (PostgREST embed).
export type DemoAppointmentWithSetter = DemoAppointment & {
  setter: { name: string } | { name: string }[] | null
}

// PostgREST to-one embed obje ya da tek elemanlı dizi dönebilir → adı çıkar.
export function embeddedName(
  rel: { name: string } | { name: string }[] | null | undefined,
): string | null {
  if (!rel) return null
  return Array.isArray(rel) ? (rel[0]?.name ?? null) : rel.name
}

// ── Demo randevu durumları ───────────────────────────────────────────────
export const DEMO_STATUS_VALUES = [
  "scheduled",
  "completed",
  "no_show",
  "cancelled",
  "rescheduled",
] as const

export type DemoStatus = (typeof DEMO_STATUS_VALUES)[number]

export const DEMO_STATUS_LABEL: Record<DemoStatus, string> = {
  scheduled: "Planlandı",
  completed: "Tamamlandı",
  no_show: "Gelmedi",
  cancelled: "İptal",
  rescheduled: "Ertelendi",
}

export const DEMO_STATUS_COLORS: Record<DemoStatus, string> = {
  scheduled: "bg-indigo-100 text-indigo-800 border-indigo-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  no_show: "bg-red-100 text-red-800 border-red-200",
  cancelled: "bg-zinc-100 text-zinc-600 border-zinc-200",
  rescheduled: "bg-amber-100 text-amber-800 border-amber-200",
}

// ── Görüşme sonucu (opsiyonel) ───────────────────────────────────────────
export const DEMO_OUTCOME_VALUES = [
  "interested",
  "follow_up",
  "closed_won",
  "closed_lost",
] as const

export type DemoOutcome = (typeof DEMO_OUTCOME_VALUES)[number]

export const DEMO_OUTCOME_OPTIONS: { value: DemoOutcome; label: string }[] = [
  { value: "interested", label: "İlgileniyor" },
  { value: "follow_up", label: "Takip Gerekli" },
  { value: "closed_won", label: "Kazanıldı" },
  { value: "closed_lost", label: "Kaybedildi" },
]

export const DEMO_OUTCOME_LABEL: Record<DemoOutcome, string> = DEMO_OUTCOME_OPTIONS.reduce(
  (acc, o) => {
    acc[o.value] = o.label
    return acc
  },
  {} as Record<DemoOutcome, string>,
)

// ── Türetilmiş demo durumu (yaşam döngüsü rozeti) ────────────────────────
// Ham status + scheduled_at'ten kullanıcıya gösterilecek durumu türetir.
// 'scheduled' geçmişse "Sonuç bekliyor", gelecekse "Yaklaşıyor" olur.
// Hydration güvenli olması için key SUNUCUDA hesaplanır, client DEMO_DISPLAY'den render eder.
export type DemoDisplayKey =
  | "upcoming"
  | "awaiting"
  | "completed"
  | "no_show"
  | "rescheduled"
  | "cancelled"

export const DEMO_DISPLAY: Record<DemoDisplayKey, { label: string; color: string }> = {
  upcoming: { label: "Yaklaşıyor", color: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  awaiting: { label: "Sonuç bekliyor", color: "bg-orange-100 text-orange-800 border-orange-200" },
  completed: { label: "Geldi", color: "bg-green-100 text-green-800 border-green-200" },
  no_show: { label: "Gelmedi", color: "bg-red-100 text-red-800 border-red-200" },
  rescheduled: { label: "Ertelendi", color: "bg-amber-100 text-amber-800 border-amber-200" },
  cancelled: { label: "İptal", color: "bg-zinc-100 text-zinc-600 border-zinc-200" },
}

// Satış CRM listesinde bir kurum satırının "aktif demosu" (özet gösterim).
export type RowDemo = {
  id: string
  scheduledAt: string
  displayKey: DemoDisplayKey
  setById: string | null
  setterName: string | null
}

export function computeDemoDisplayKey(
  status: string,
  scheduledAt: string,
  nowMs: number,
): DemoDisplayKey {
  if (status === "scheduled") {
    return new Date(scheduledAt).getTime() < nowMs ? "awaiting" : "upcoming"
  }
  if (
    status === "completed" ||
    status === "no_show" ||
    status === "rescheduled" ||
    status === "cancelled"
  ) {
    return status
  }
  return "cancelled"
}

// scheduled_at (timestamptz ISO) → Istanbul takviminde "dd.MM.yyyy HH:mm".
// lib/tz.ts ile aynı yaklaşım: Intl + timeZone Europe/Istanbul (yeni tz helper yok).
export function formatDemoDateTime(iso: string | null | undefined): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d)
}

// scheduled_at → Istanbul takviminde sadece saat "HH:mm".
export function formatDemoTime(iso: string | null | undefined): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d)
}

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
