import { istanbulDateStr, istanbulDaysAgoStr } from "@/lib/tz"

// Bireysel öğrenci listesi — saf hesaplar (özet kartlar, UTM kırılımı, günlük kayıt).
// Kaynak satırlar individual_students_overview() RPC'sinden gelir (migration 218).

export type IndividualStudentRow = {
  id: string
  full_name: string
  email: string
  created_at: string
  source: "ucretsiz_kayit" | "davet" | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  segment: string | null
  alan: string | null
  grade: string | null
  email_confirmed: boolean
  upplan_completed: boolean
  last_sign_in_at: string | null
  sessions_7d: number
  first_session_date: string | null
  last_activity_date: string | null
  /** null → kayıt 7 günden yeni (henüz ölçülemez). */
  returned_d7: boolean | null
  compliance_percent: number | null
}

export const SOURCE_LABEL: Record<"ucretsiz_kayit" | "davet" | "diger", string> = {
  ucretsiz_kayit: "Ücretsiz kayıt",
  davet: "Davet",
  diger: "Diğer / eski kayıt",
}

export const DIRECT_UTM = "(doğrudan)"

export function utmKey(row: Pick<IndividualStudentRow, "utm_source">): string {
  return row.utm_source?.trim() || DIRECT_UTM
}

/** Aktif: son 7 günde (Istanbul, bugün dahil) giriş veya soru kaydı var. */
export function isActive(row: Pick<IndividualStudentRow, "last_activity_date">, now: Date = new Date()): boolean {
  return !!row.last_activity_date && row.last_activity_date >= istanbulDaysAgoStr(6, now)
}

function rate(n: number, d: number): number | null {
  return d === 0 ? null : Math.round((n / d) * 100)
}

export type IndividualSummary = {
  total: number
  newToday: number
  newThisWeek: number
  verifiedRate: number | null
  setupRate: number | null
  firstSessionRate: number | null
  /** 7. gün geri dönüş: yalnız kaydı ≥7 gün olanlar arasında. */
  d7Rate: number | null
  d7Eligible: number
}

export function summarize(rows: IndividualStudentRow[], now: Date = new Date()): IndividualSummary {
  const today = istanbulDateStr(now)
  const weekAgo = istanbulDaysAgoStr(6, now)
  const day = (iso: string) => istanbulDateStr(new Date(iso))
  const eligible = rows.filter((r) => r.returned_d7 !== null)
  return {
    total: rows.length,
    newToday: rows.filter((r) => day(r.created_at) === today).length,
    newThisWeek: rows.filter((r) => day(r.created_at) >= weekAgo).length,
    verifiedRate: rate(rows.filter((r) => r.email_confirmed).length, rows.length),
    setupRate: rate(rows.filter((r) => r.upplan_completed).length, rows.length),
    firstSessionRate: rate(rows.filter((r) => r.first_session_date !== null).length, rows.length),
    d7Rate: rate(eligible.filter((r) => r.returned_d7).length, eligible.length),
    d7Eligible: eligible.length,
  }
}

export type UtmBreakdownRow = {
  source: string
  count: number
  verifiedRate: number | null
  setupRate: number | null
  firstSessionRate: number | null
  activeCount: number
}

export function utmBreakdown(rows: IndividualStudentRow[], now: Date = new Date()): UtmBreakdownRow[] {
  const groups = new Map<string, IndividualStudentRow[]>()
  for (const r of rows) {
    const k = utmKey(r)
    groups.set(k, [...(groups.get(k) ?? []), r])
  }
  return Array.from(groups.entries())
    .map(([source, list]) => ({
      source,
      count: list.length,
      verifiedRate: rate(list.filter((r) => r.email_confirmed).length, list.length),
      setupRate: rate(list.filter((r) => r.upplan_completed).length, list.length),
      firstSessionRate: rate(list.filter((r) => r.first_session_date !== null).length, list.length),
      activeCount: list.filter((r) => isActive(r, now)).length,
    }))
    .sort((a, b) => b.count - a.count)
}

/** Son `days` gün (Istanbul) için günlük kayıt sayısı; etiket DD.MM. */
export function dailySignups(rows: IndividualStudentRow[], days = 30, now: Date = new Date()): { month: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const r of rows) {
    const d = istanbulDateStr(new Date(r.created_at))
    counts.set(d, (counts.get(d) ?? 0) + 1)
  }
  const out: { month: string; count: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = istanbulDaysAgoStr(i, now)
    out.push({ month: `${d.slice(8, 10)}.${d.slice(5, 7)}`, count: counts.get(d) ?? 0 })
  }
  return out
}

export type IndividualFilters = {
  query: string
  source: "__all__" | "ucretsiz_kayit" | "davet" | "diger"
  utm: string
  from: string
  to: string
  setup: "__all__" | "tamam" | "eksik"
  activity: "__all__" | "aktif" | "pasif"
}

export const INDIVIDUAL_FILTER_DEFAULTS: IndividualFilters = {
  query: "",
  source: "__all__",
  utm: "__all__",
  from: "",
  to: "",
  setup: "__all__",
  activity: "__all__",
}

export function applyFilters(rows: IndividualStudentRow[], f: IndividualFilters, now: Date = new Date()): IndividualStudentRow[] {
  const q = f.query.trim().toLocaleLowerCase("tr")
  return rows.filter((r) => {
    if (q && !r.full_name.toLocaleLowerCase("tr").includes(q) && !r.email.toLowerCase().includes(q)) return false
    if (f.source !== "__all__" && (r.source ?? "diger") !== f.source) return false
    if (f.utm !== "__all__" && utmKey(r) !== f.utm) return false
    const day = istanbulDateStr(new Date(r.created_at))
    if (f.from && day < f.from) return false
    if (f.to && day > f.to) return false
    if (f.setup === "tamam" && !r.upplan_completed) return false
    if (f.setup === "eksik" && r.upplan_completed) return false
    if (f.activity !== "__all__" && isActive(r, now) !== (f.activity === "aktif")) return false
    return true
  })
}
