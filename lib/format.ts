import { format } from "date-fns"
import { tr } from "date-fns/locale"

const tryFormatter = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatTRY(n: number | string | null | undefined) {
  if (n === null || n === undefined || n === "") return "₺0,00"
  const num = typeof n === "string" ? Number(n) : n
  if (!Number.isFinite(num)) return "₺0,00"
  return tryFormatter.format(num)
}

export function formatDate(d: string | Date | null | undefined, pattern = "d MMMM yyyy") {
  if (!d) return "-"
  const date = typeof d === "string" ? new Date(d) : d
  if (Number.isNaN(date.getTime())) return "-"
  return format(date, pattern, { locale: tr })
}

export function formatMonth(d: string | Date | null | undefined) {
  return formatDate(d, "MMMM yyyy")
}

export function isoDate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}
