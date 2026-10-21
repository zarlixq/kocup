import { addDaysIso } from "@/lib/upplan/roadmap"

// Playlist çalışma planı — saf fonksiyonlar (sunucu + istemci, test edilir).
// Plan "gün grupları"ndan oluşur: plan_day = 1.. ; aynı gruptaki videolar aynı
// tarihte izlenir. Tarihler başlangıçtan itibaren yalnız seçili hafta günlerine
// dağılır (1=Pzt..7=Paz). "Kaydır" bekleyen grupları bugünden itibaren yeniden
// yerleştirir; hiçbir grup eski tarihinden daha erkene çekilmez.

export type PlanMode = "gun_yapisi" | "video" | "dakika"
export const PLAN_MODES: readonly PlanMode[] = ["gun_yapisi", "video", "dakika"]
export const ALL_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const
export const WEEKDAY_SHORT: Record<number, string> = { 1: "Pzt", 2: "Sal", 3: "Çar", 4: "Per", 5: "Cum", 6: "Cmt", 7: "Paz" }

/** Süresi bilinmeyen video dakika planında bu kadar sayılır. */
export const UNKNOWN_VIDEO_MINUTES = 20
/** Gün yapısı "algılandı" sayılması için gün numarası taşıyan video oranı. */
export const DAY_PATTERN_MIN_RATIO = 0.6

/** ISO tarih → 1=Pzt..7=Paz. */
export function isoWeekday(iso: string): number {
  const d = new Date(`${iso}T00:00:00Z`).getUTCDay()
  return d === 0 ? 7 : d
}

// "1. Gün", "12.Gün", "Gün 5", "GÜN-5", "5.gun". "55 Günde" gibi ifadeler sayılmaz
// (noktasız sayı + "Gün" ve "Gün"den sonra harf gelmesi elenir).
const DAY_RE = /(?:^|[^\d])(\d{1,3})\s*\.\s*g[üu]n(?![a-zçğıöşü])|g[üu]n\s*[-:#]?\s*(\d{1,3})(?!\d)/i

/** Başlıktaki gün numarası (yoksa null). */
export function dayNumberOf(title: string): number | null {
  const m = title.toLocaleLowerCase("tr").match(DAY_RE)
  if (!m) return null
  const n = Number(m[1] ?? m[2])
  return n > 0 && n <= 1000 ? n : null
}

export type DayStructure = { detected: boolean; days: number; ratio: number }

/**
 * Başlıklarda "N. Gün" kalıbı var mı. Videoların en az %60'ında gün numarası
 * ve en az 2 farklı gün olmalı.
 */
export function detectDayStructure(titles: string[]): DayStructure {
  const nums = titles.map(dayNumberOf)
  const withDay = nums.filter((n): n is number => n !== null)
  const ratio = titles.length ? withDay.length / titles.length : 0
  const days = new Set(withDay).size
  return { detected: ratio >= DAY_PATTERN_MIN_RATIO && days >= 2, days, ratio: Math.round(ratio * 100) / 100 }
}

/**
 * Playlist sırasındaki videolar → plan günü (1..). Sıra korunur:
 *  - gun_yapisi: başlıktaki gün numarası yeni bir gün başlatır; numarasız video
 *    ve geriye giden numara (playlist'teki sıra hatası) bir önceki güne eklenir;
 *    ilk günden önceki numarasız videolar (tanıtım) ilk güne katılır.
 *  - video: günde `amount` video.
 *  - dakika: günde ~`amount` dakika (günde en az 1 video; sığmayan sonraki güne).
 */
export function groupIntoDays(
  videos: { title: string; duration_seconds: number | null }[],
  mode: PlanMode,
  amount: number | null,
): number[] {
  const out: number[] = []
  if (videos.length === 0) return out
  if (mode === "gun_yapisi") {
    let day = 0
    let lastNum = -Infinity
    for (const v of videos) {
      const n = dayNumberOf(v.title)
      if (n !== null && n > lastNum) {
        lastNum = n
        day += 1
      }
      out.push(Math.max(day, 1))
    }
    return out
  }
  if (mode === "video") {
    const per = Math.max(1, Math.floor(amount ?? 1))
    return videos.map((_, i) => Math.floor(i / per) + 1)
  }
  const cap = Math.max(1, amount ?? 60) * 60
  let day = 1
  let used = 0
  for (const v of videos) {
    const sec = v.duration_seconds ?? UNKNOWN_VIDEO_MINUTES * 60
    if (used > 0 && used + sec > cap) {
      day += 1
      used = 0
    }
    used += sec
    out.push(day)
  }
  return out
}

/** `from` dahil, seçili hafta günlerine düşen ilk tarih. */
export function nextStudyDate(from: string, weekdays: readonly number[]): string {
  const set = new Set(weekdays.length ? weekdays : ALL_WEEKDAYS)
  let d = from
  for (let i = 0; i < 7; i++) {
    if (set.has(isoWeekday(d))) return d
    d = addDaysIso(d, 1)
  }
  return from
}

/** `count` plan günü için tarihler: başlangıçtan itibaren, yalnız seçili hafta günleri. */
export function planDates(count: number, start: string, weekdays: readonly number[]): string[] {
  const out: string[] = []
  let d = nextStudyDate(start, weekdays)
  for (let i = 0; i < count; i++) {
    out.push(d)
    d = nextStudyDate(addDaysIso(d, 1), weekdays)
  }
  return out
}

export type PlanUnit = { day: number; date: string; pending: boolean }

/**
 * Kaydır: bekleyen (izlenmemiş videosu olan) gruplar sırayla bugünden itibaren
 * yeniden yerleşir. Her grup ≥ kendi eski tarihi ve ≥ önceki grubun yeni
 * tarihinden sonraki çalışma günü. Biten gruplar yerinde kalır.
 * Dönüş: tarihi değişen grup → yeni tarih.
 */
export function reflowPlan(units: PlanUnit[], today: string, weekdays: readonly number[]): Map<number, string> {
  const changes = new Map<number, string>()
  let cursor = today
  for (const u of [...units].sort((a, b) => a.day - b.day)) {
    if (!u.pending) continue
    const floor = u.date > cursor ? u.date : cursor
    const date = nextStudyDate(floor, weekdays)
    if (date !== u.date) changes.set(u.day, date)
    cursor = addDaysIso(date, 1)
  }
  return changes
}

export type PlanVideo = {
  plan_day: number | null
  planned_date: string | null
  watch_status: string
  duration_seconds: number | null
}

export type PlanStatus = {
  planned: boolean
  watched: number
  total: number
  /** Plana göre: + önde, − geride (gün grubu sayısı), 0 uyumlu. */
  offsetDays: number
  /** Dünden ve öncesinden izlenmemiş video sayısı. */
  overdue: number
  plannedEnd: string | null
  /** Kalan plan bugünden kaydırılırsa bitiş. */
  estimatedEnd: string | null
}

/** Plan günlerini tarih ve bekleme durumuyla çıkarır. */
export function planUnits(videos: PlanVideo[]): PlanUnit[] {
  const map = new Map<number, PlanUnit>()
  for (const v of videos) {
    if (v.plan_day == null || !v.planned_date) continue
    const u = map.get(v.plan_day) ?? { day: v.plan_day, date: v.planned_date, pending: false }
    if (v.planned_date < u.date) u.date = v.planned_date
    if (v.watch_status !== "izlendi") u.pending = true
    map.set(v.plan_day, u)
  }
  return Array.from(map.values()).sort((a, b) => a.day - b.day)
}

export function planStatus(videos: PlanVideo[], today: string, weekdays: readonly number[]): PlanStatus {
  const total = videos.length
  const watched = videos.filter((v) => v.watch_status === "izlendi").length
  const units = planUnits(videos)
  if (units.length === 0) {
    return { planned: false, watched, total, offsetDays: 0, overdue: 0, plannedEnd: null, estimatedEnd: null }
  }
  const overdue = videos.filter((v) => v.planned_date && v.planned_date < today && v.watch_status !== "izlendi").length
  const behind = units.filter((u) => u.date < today && u.pending).length
  const ahead = units.filter((u) => u.date > today && !u.pending).length
  const plannedEnd = units[units.length - 1].date
  const moved = reflowPlan(units, today, weekdays)
  const lastPending = units.filter((u) => u.pending).at(-1)
  const estimatedEnd = lastPending ? (moved.get(lastPending.day) ?? lastPending.date) : null
  return { planned: true, watched, total, offsetDays: ahead - behind, overdue, plannedEnd, estimatedEnd }
}

/** Plan günü başına toplam dakika (müsaitlik uyarısı / UpPlan bloğu). */
export function minutesByDate(videos: PlanVideo[], onlyPending = true): Map<string, number> {
  const out = new Map<string, number>()
  for (const v of videos) {
    if (!v.planned_date || (onlyPending && v.watch_status === "izlendi")) continue
    const min = (v.duration_seconds ?? UNKNOWN_VIDEO_MINUTES * 60) / 60
    out.set(v.planned_date, (out.get(v.planned_date) ?? 0) + min)
  }
  return out
}

/** "3 gün önde" / "2 gün geride" / "Plana uygun". */
export function offsetLabel(offset: number): string {
  if (offset > 0) return `${offset} gün önde`
  if (offset < 0) return `${-offset} gün geride`
  return "Plana uygun"
}

/** "2026-10-22" → "22.10.2026". */
export function formatDateTr(iso: string | null | undefined): string {
  if (!iso) return "—"
  const [y, m, d] = iso.split("-")
  return `${d}.${m}.${y}`
}

/** Müsaitlik ızgarası → hafta günü başına dakika (30 dk slot). */
export function availabilityMinutes(availability: Record<string, number[]> | null | undefined, slotMinutes = 30): Record<number, number> {
  const out: Record<number, number> = {}
  for (const d of ALL_WEEKDAYS) out[d] = (availability?.[String(d)]?.length ?? 0) * slotMinutes
  return out
}

/** Haftalık müsaitlik ızgarası (gün → slot listesi) → çalışılan hafta günleri. */
export function weekdaysFromAvailability(availability: Record<string, number[]> | null | undefined): number[] {
  const days = ALL_WEEKDAYS.filter((d) => (availability?.[String(d)]?.length ?? 0) > 0)
  return days.length ? [...days] : [...ALL_WEEKDAYS]
}

/** Plan önizlemesi: gün sayısı, bitiş, en yoğun günün dakikası. */
export function previewPlan(
  videos: { title: string; duration_seconds: number | null }[],
  mode: PlanMode,
  amount: number | null,
  start: string,
  weekdays: readonly number[],
): { days: number; end: string | null; maxDayMinutes: number; avgDayMinutes: number } {
  const groups = groupIntoDays(videos, mode, amount)
  const days = groups.length ? groups[groups.length - 1] : 0
  const dates = planDates(days, start, weekdays)
  const perDay = new Array<number>(days).fill(0)
  videos.forEach((v, i) => (perDay[groups[i] - 1] += (v.duration_seconds ?? UNKNOWN_VIDEO_MINUTES * 60) / 60))
  const total = perDay.reduce((s, m) => s + m, 0)
  return {
    days,
    end: dates.at(-1) ?? null,
    maxDayMinutes: Math.round(Math.max(0, ...perDay)),
    avgDayMinutes: days ? Math.round(total / days) : 0,
  }
}

