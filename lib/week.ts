import { isoDate } from "@/lib/format"

// Verilen tarihin ait olduğu haftanın Pazartesi'sini YYYY-MM-DD döndürür.
export function getWeekStart(d: Date = new Date()): string {
  const day = (d.getDay() + 6) % 7 // Pzt=0 .. Paz=6
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day)
  return isoDate(monday)
}

// YYYY-MM-DD (yerel gün) parse — timezone kaymasını önlemek için elle.
export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

// week_start ISO'ya n hafta ekler/çıkarır, YYYY-MM-DD döndürür.
export function addWeeks(iso: string, n: number): string {
  const base = parseIsoDate(iso)
  base.setDate(base.getDate() + n * 7)
  return isoDate(base)
}

export function isValidWeekStartParam(v: string | undefined): v is string {
  return !!v && /^\d{4}-\d{2}-\d{2}$/.test(v)
}

const MONTHS_SHORT = [
  "Oca", "Şub", "Mar", "Nis", "May", "Haz",
  "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara",
]

// "07 – 13 Temmuz 2026" gibi hafta aralığı etiketi.
export function formatWeekRange(weekStartIso: string): string {
  const start = parseIsoDate(weekStartIso)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  const dd = (n: number) => String(n).padStart(2, "0")
  const sameMonth = start.getMonth() === end.getMonth()
  if (sameMonth) {
    return `${dd(start.getDate())} – ${dd(end.getDate())} ${MONTHS_SHORT[end.getMonth()]} ${end.getFullYear()}`
  }
  return `${dd(start.getDate())} ${MONTHS_SHORT[start.getMonth()]} – ${dd(end.getDate())} ${MONTHS_SHORT[end.getMonth()]} ${end.getFullYear()}`
}
