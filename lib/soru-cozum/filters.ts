import { addDays } from "@/lib/soru-cozum/summary"

// Soru çözüm listesi URL filtreleri: ?aralik=7|30|90|tum|ozel&bas=&bit=&ders=&konu=
export type RangeKey = "7" | "30" | "90" | "tum" | "ozel"

export const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "7", label: "Son 7 gün" },
  { key: "30", label: "Son 30 gün" },
  { key: "90", label: "Son 3 ay" },
  { key: "tum", label: "Tümü" },
  { key: "ozel", label: "Tarih seç" },
]

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type SessionFilter = {
  range: RangeKey
  from: string | null // dahil
  to: string // dahil
  rawFrom: string | null
  rawTo: string | null
  subjectId: string | null
  topicId: string | null
}

function one(v: string | string[] | undefined): string | null {
  const s = Array.isArray(v) ? v[0] : v
  return s && s.trim() ? s.trim() : null
}

export function parseSessionFilter(
  sp: Record<string, string | string[] | undefined>,
  today: string,
): SessionFilter {
  const rangeRaw = one(sp.aralik)
  const range: RangeKey = RANGE_OPTIONS.some((o) => o.key === rangeRaw) ? (rangeRaw as RangeKey) : "30"
  const bas = one(sp.bas)
  const bit = one(sp.bit)
  const rawFrom = bas && DATE_RE.test(bas) ? bas : null
  const rawTo = bit && DATE_RE.test(bit) ? bit : null
  const ders = one(sp.ders)
  const konu = one(sp.konu)

  let from: string | null
  let to = today
  if (range === "tum") from = null
  else if (range === "ozel") {
    from = rawFrom
    to = rawTo && rawTo < today ? rawTo : today
  } else from = addDays(today, -(Number(range) - 1))

  return {
    range,
    from,
    to,
    rawFrom,
    rawTo,
    subjectId: ders && UUID_RE.test(ders) ? ders : null,
    topicId: konu && UUID_RE.test(konu) ? konu : null,
  }
}
