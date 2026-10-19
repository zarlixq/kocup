// Konularım zaman çizelgesi yardımcıları — saf (client + server).

export type TimelineStatus = "aktif" | "sirada" | "zaman_kalirsa" | "tamamlandi" | "iptal"
export type TimelineMonth = { month: string; topics: { name: string; status: TimelineStatus }[] }

const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"]

export function monthLabel(ym: string): string {
  return `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`
}

/** Ay ay hangi konular (başlangıç–bitiş aralığı o aya değenler). */
export function buildTimeline(rows: { topic_name: string; status: TimelineStatus; start: string; end: string }[], from: string, to: string): TimelineMonth[] {
  const out: TimelineMonth[] = []
  let ym = from.slice(0, 7)
  const last = to.slice(0, 7)
  while (ym <= last) {
    const mStart = `${ym}-01`
    const next = new Date(`${mStart}T00:00:00Z`)
    next.setUTCMonth(next.getUTCMonth() + 1)
    const mEnd = next.toISOString().slice(0, 10)
    const topics = rows.filter((r) => r.start < mEnd && r.end >= mStart).map((r) => ({ name: r.topic_name, status: r.status }))
    out.push({ month: ym, topics })
    ym = mEnd.slice(0, 7)
  }
  return out
}
