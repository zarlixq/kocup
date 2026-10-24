import type { Compliance } from "@/lib/analytics/compliance"
import { FEEDBACK_REASONS, type FeedbackReason } from "@/lib/upplan/feedback"
import type { Track } from "@/lib/upplan/track"

// UpPlan metrikleri (süper-admin) — track bazında; saf fonksiyonlar. Algoritma ayarını
// yönlendirir: taslak kabul/red, blok değiştirme oranı ve nedenleri, haftalık uyum, puan.

export type TrackKey = Track | "yok"
const key = (t: Track | null | undefined): TrackKey => t ?? "yok"

export type TrackMetrics = {
  track: TrackKey
  students: number
  drafts: { taslak: number; onaylandi: number; reddedildi: number; koca_onerildi: number; superseded: number }
  /** onaylandi / (onaylandi + reddedildi); karar yoksa null. */
  acceptance: number | null
  blocks: number
  changes: number
  /** Değiştirilen blok / taslaklardaki blok. */
  changeRate: number | null
  reasons: { reason: FeedbackReason; count: number }[]
  /** Haftalık program uyumu (yapılan / planlanan kalem, havuzlanmış). */
  compliance: number | null
  ratingAvg: number | null
  ratings: number
}

export function metricsByTrack(input: {
  trackOf: Map<string, Track | null>
  drafts: { student_id: string; status: string; blocks: number }[]
  feedback: { student_id: string; reason: string; track: string | null }[]
  compliance: Map<string, Compliance>
  ratings: { student_id: string; rating: number }[]
}): TrackMetrics[] {
  const out = new Map<TrackKey, TrackMetrics>()
  const get = (t: TrackKey) => {
    let m = out.get(t)
    if (!m) {
      m = {
        track: t,
        students: 0,
        drafts: { taslak: 0, onaylandi: 0, reddedildi: 0, koca_onerildi: 0, superseded: 0 },
        acceptance: null,
        blocks: 0,
        changes: 0,
        changeRate: null,
        reasons: [],
        compliance: null,
        ratingAvg: null,
        ratings: 0,
      }
      out.set(t, m)
    }
    return m
  }
  for (const t of input.trackOf.values()) get(key(t)).students += 1
  for (const d of input.drafts) {
    const m = get(key(input.trackOf.get(d.student_id)))
    if (d.status in m.drafts) m.drafts[d.status as keyof TrackMetrics["drafts"]] += 1
    m.blocks += d.blocks
  }
  const reasonCount = new Map<TrackKey, Map<FeedbackReason, number>>()
  for (const f of input.feedback) {
    const t = key(input.trackOf.get(f.student_id))
    get(t).changes += 1
    if (!(FEEDBACK_REASONS as readonly string[]).includes(f.reason)) continue
    const rc = reasonCount.get(t) ?? new Map<FeedbackReason, number>()
    rc.set(f.reason as FeedbackReason, (rc.get(f.reason as FeedbackReason) ?? 0) + 1)
    reasonCount.set(t, rc)
  }
  const comp = new Map<TrackKey, { done: number; total: number }>()
  for (const c of input.compliance.values()) {
    const t = key(input.trackOf.get(c.studentId))
    const cur = comp.get(t) ?? { done: 0, total: 0 }
    comp.set(t, { done: cur.done + c.doneItems, total: cur.total + c.totalItems })
    get(t)
  }
  const rate = new Map<TrackKey, number[]>()
  for (const r of input.ratings) {
    const t = key(input.trackOf.get(r.student_id))
    rate.set(t, [...(rate.get(t) ?? []), r.rating])
    get(t)
  }
  const round = (v: number) => Math.round(v * 1000) / 1000
  for (const m of out.values()) {
    const decided = m.drafts.onaylandi + m.drafts.reddedildi
    m.acceptance = decided > 0 ? round(m.drafts.onaylandi / decided) : null
    m.changeRate = m.blocks > 0 ? round(m.changes / m.blocks) : null
    m.reasons = Array.from(reasonCount.get(m.track) ?? [], ([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count)
    const c = comp.get(m.track)
    m.compliance = c && c.total > 0 ? round(c.done / c.total) : null
    const rs = rate.get(m.track) ?? []
    m.ratings = rs.length
    m.ratingAvg = rs.length ? round(rs.reduce((a, b) => a + b, 0) / rs.length) : null
  }
  const order: TrackKey[] = ["maarif_9", "maarif_10", "maarif_11", "maarif_12", "eski_12", "mezun", "lgs", "yok"]
  return Array.from(out.values()).sort((a, b) => order.indexOf(a.track) - order.indexOf(b.track))
}
