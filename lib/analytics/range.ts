// Ziyaret dashboard'u için tarih aralığı yardımcıları.
// "1" = bugün (son 24 saat), "7"/"30"/"90" = son N gün.
// Önceki dönem aynı uzunlukta — % değişim hesabı için.

export type RangeKey = "1" | "7" | "30" | "90"

export const RANGE_LABELS: Record<RangeKey, string> = {
  "1": "Bugün",
  "7": "7 gün",
  "30": "30 gün",
  "90": "90 gün",
}

export const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "1", label: "Bugün" },
  { key: "7", label: "7g" },
  { key: "30", label: "30g" },
  { key: "90", label: "90g" },
]

export function isValidRange(v: unknown): v is RangeKey {
  return v === "1" || v === "7" || v === "30" || v === "90"
}

export type ComputedRange = {
  start: Date
  end: Date
  prevStart: Date
  days: number
}

export function computeRange(rangeKey: RangeKey, now: Date = new Date()): ComputedRange {
  const days = parseInt(rangeKey, 10)
  const end = now
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  const prevStart = new Date(start.getTime() - days * 24 * 60 * 60 * 1000)
  return { start, end, prevStart, days }
}
