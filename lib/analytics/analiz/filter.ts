import { istanbulDateStr, istanbulDaysAgoStr } from "@/lib/tz"

// Analizim üst filtresi — CLIENT-SAFE. URL parametreleri (?aralik, ?bas, ?bit,
// ?ders) tek kaynak; kalıcılık user_ui_preferences (scope "analiz_filter").

export const RANGE_OPTIONS = [
  { value: "7g", label: "7 gün", days: 7 },
  { value: "30g", label: "30 gün", days: 30 },
  { value: "3a", label: "3 ay", days: 90 },
  { value: "tum", label: "Tümü", days: null },
  { value: "ozel", label: "Özel", days: null },
] as const

export type RangeKey = (typeof RANGE_OPTIONS)[number]["value"]

export type AnalizFilter = {
  range: RangeKey
  /** Yalnız "ozel": YYYY-MM-DD. */
  from: string | null
  to: string | null
  subjectId: string | null
}

export const DEFAULT_FILTER: AnalizFilter = { range: "30g", from: null, to: null, subjectId: null }

/** "Tümü" seçiliyken günlük sorguların alt sınırı. */
export const ALL_TIME_START = "2020-01-01"

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isRange(v: unknown): v is RangeKey {
  return RANGE_OPTIONS.some((o) => o.value === v)
}

function validDate(v: unknown): string | null {
  return typeof v === "string" && DATE_RE.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) ? v : null
}

/** Kaydedilmiş (bilinmeyen biçimli) tercihi güvenle filtreye çevirir. */
export function mergeAnalizFilter(raw: unknown): AnalizFilter {
  if (!raw || typeof raw !== "object") return DEFAULT_FILTER
  const r = raw as Record<string, unknown>
  return {
    range: isRange(r.range) ? r.range : DEFAULT_FILTER.range,
    from: validDate(r.from),
    to: validDate(r.to),
    subjectId: typeof r.subjectId === "string" && UUID_RE.test(r.subjectId) ? r.subjectId : null,
  }
}

type Params = Record<string, string | string[] | undefined>
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

/** URL'de filtre varsa onu, yoksa kaydedilmiş tercihi kullanır. */
export function filterFromParams(params: Params, saved: AnalizFilter): AnalizFilter {
  const range = one(params.aralik)
  if (!isRange(range)) return saved
  const ders = one(params.ders)
  return {
    range,
    from: range === "ozel" ? validDate(one(params.bas)) : null,
    to: range === "ozel" ? validDate(one(params.bit)) : null,
    subjectId: ders && UUID_RE.test(ders) ? ders : null,
  }
}

export function filterToParams(f: AnalizFilter): URLSearchParams {
  const p = new URLSearchParams({ aralik: f.range })
  if (f.range === "ozel") {
    if (f.from) p.set("bas", f.from)
    if (f.to) p.set("bit", f.to)
  }
  if (f.subjectId) p.set("ders", f.subjectId)
  return p
}

export type ResolvedRange = {
  /** null → tüm zamanlar. */
  from: string | null
  to: string
  /** Gün sayısı (tüm zamanlarda null). */
  days: number | null
  label: string
}

const MAX_CUSTOM_DAYS = 730

function dayDiff(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000)
}

export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function trDate(iso: string): string {
  return `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`
}

export function resolveRange(f: AnalizFilter, now: Date = new Date()): ResolvedRange {
  const today = istanbulDateStr(now)
  if (f.range === "ozel" && f.from && f.to) {
    let [from, to] = f.from <= f.to ? [f.from, f.to] : [f.to, f.from]
    if (to > today) to = today
    if (from > to) from = to
    if (dayDiff(from, to) > MAX_CUSTOM_DAYS) from = addDays(to, -MAX_CUSTOM_DAYS)
    return { from, to, days: dayDiff(from, to) + 1, label: `${trDate(from)} – ${trDate(to)}` }
  }
  const opt = RANGE_OPTIONS.find((o) => o.value === f.range && o.days !== null)
  if (!opt || opt.days === null) return { from: null, to: today, days: null, label: "Tüm zamanlar" }
  return { from: istanbulDaysAgoStr(opt.days - 1, now), to: today, days: opt.days, label: `Son ${opt.label}` }
}

/** "Gelişen konular" için dönemin ortası (tüm zamanlarda son 30 gün). */
export function splitDate(r: ResolvedRange, now: Date = new Date()): string {
  if (!r.from || !r.days) return istanbulDaysAgoStr(29, now)
  return addDays(r.from, Math.floor(r.days / 2))
}

/** Tarih gösterimi: gg.aa (grafik ekseni) / gg.aa.yyyy. */
export function fmtDay(iso: string, withYear = false): string {
  return withYear ? trDate(iso) : `${iso.slice(8, 10)}.${iso.slice(5, 7)}`
}
