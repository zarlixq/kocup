import { istanbulDateStr, istanbulDaysAgoStr } from "@/lib/tz"
import { playlistDisplayName, type PlaylistRow, type VideoRow } from "@/lib/resources/videos"

// Video takip özetleri — saf fonksiyonlar (sunucuda hesaplanır, test edilir).
// Gün sınırları Istanbul takvimine göre (lib/tz).

export type PlaylistProgress = {
  watched: number
  total: number
  remainingSeconds: number
  /** Süresi bilinmeyen kalan video sayısı (anahtarsız eklenenler). */
  remainingUnknown: number
  next: VideoRow | null
  complete: boolean
}

export function playlistProgress(p: Pick<PlaylistRow, "videos">): PlaylistProgress {
  let watched = 0
  let remainingSeconds = 0
  let remainingUnknown = 0
  let next: VideoRow | null = null
  for (const v of p.videos) {
    if (v.watch_status === "izlendi") {
      watched += 1
      continue
    }
    if (!next || v.position < next.position) next = v
    if (v.duration_seconds == null) remainingUnknown += 1
    else remainingSeconds += v.duration_seconds
  }
  const total = p.videos.length
  return { watched, total, remainingSeconds, remainingUnknown, next, complete: total > 0 && watched === total }
}

/** Kart durumu: öğrencinin seçimi ya da tüm videolar izlendiyse tamamlandı. */
export function effectiveStatus(p: Pick<PlaylistRow, "status" | "videos">): PlaylistRow["status"] {
  if (p.status === "tamamlandi" || playlistProgress(p).complete) return "tamamlandi"
  return p.status
}

export type SubjectVideoSummary = {
  subject_id: string
  subject_name: string
  color: string | null
  watched: number
  total: number
  remaining: number
  remainingSeconds: number
  remainingUnknown: number
  lastWatchedAt: string | null
}

export function summarizeBySubject(playlists: PlaylistRow[]): SubjectVideoSummary[] {
  const map = new Map<string, SubjectVideoSummary>()
  for (const p of playlists) {
    const s =
      map.get(p.subject_id) ??
      map
        .set(p.subject_id, {
          subject_id: p.subject_id,
          subject_name: p.subject_name,
          color: p.subject_color,
          watched: 0,
          total: 0,
          remaining: 0,
          remainingSeconds: 0,
          remainingUnknown: 0,
          lastWatchedAt: null,
        })
        .get(p.subject_id)!
    const pr = playlistProgress(p)
    s.watched += pr.watched
    s.total += pr.total
    s.remaining += pr.total - pr.watched
    s.remainingSeconds += pr.remainingSeconds
    s.remainingUnknown += pr.remainingUnknown
    for (const v of p.videos) {
      if (v.watched_at && (!s.lastWatchedAt || v.watched_at > s.lastWatchedAt)) s.lastWatchedAt = v.watched_at
    }
  }
  return Array.from(map.values()).sort((a, b) => a.subject_name.localeCompare(b.subject_name, "tr"))
}

export function watchedOnDay(playlists: PlaylistRow[], day: string): { count: number; seconds: number } {
  let count = 0
  let seconds = 0
  for (const p of playlists) {
    for (const v of p.videos) {
      if (v.watch_status !== "izlendi" || !v.watched_at) continue
      if (istanbulDateStr(new Date(v.watched_at)) !== day) continue
      count += 1
      seconds += v.duration_seconds ?? 0
    }
  }
  return { count, seconds }
}

export type ActivitySeries = { key: string; name: string; color: string }
export type ActivityDatum = { date: string; label: string } & Record<string, number | string>

const FALLBACK_COLORS = ["#1B6B8A", "#F97316", "#10b981", "#a855f7", "#eab308", "#ef4444", "#0ea5e9", "#64748b"]

/**
 * Son `days` gün (bugün dahil), ders bazında izlenen video sayısı (c_<ders>)
 * ve dakika (m_<ders>). Seri yalnız aralıkta verisi olan dersler için.
 */
export function videoActivity(
  playlists: PlaylistRow[],
  days = 7,
  now: Date = new Date(),
): { data: ActivityDatum[]; series: ActivitySeries[] } {
  const dates = Array.from({ length: days }, (_, i) => istanbulDaysAgoStr(days - 1 - i, now))
  const index = new Map(dates.map((d, i) => [d, i]))
  const data: ActivityDatum[] = dates.map((d) => ({ date: d, label: `${d.slice(8, 10)}.${d.slice(5, 7)}` }))
  const series = new Map<string, ActivitySeries>()
  for (const p of playlists) {
    for (const v of p.videos) {
      if (v.watch_status !== "izlendi" || !v.watched_at) continue
      const i = index.get(istanbulDateStr(new Date(v.watched_at)))
      if (i === undefined) continue
      if (!series.has(p.subject_id)) {
        series.set(p.subject_id, {
          key: p.subject_id,
          name: p.subject_name,
          color: p.subject_color ?? FALLBACK_COLORS[series.size % FALLBACK_COLORS.length],
        })
      }
      const row = data[i]
      row[`c_${p.subject_id}`] = Number(row[`c_${p.subject_id}`] ?? 0) + 1
      row[`m_${p.subject_id}`] = Number(row[`m_${p.subject_id}`] ?? 0) + Math.round((v.duration_seconds ?? 0) / 60)
    }
  }
  return { data, series: Array.from(series.values()) }
}

/** Analiz / koç özeti için playlist ilerleme satırı. */
export type PlaylistProgressRow = { id: string; name: string; subject_name: string; watched: number; total: number }

export function playlistProgressRows(playlists: PlaylistRow[]): PlaylistProgressRow[] {
  return playlists
    .filter((p) => p.videos.length > 0)
    .map((p) => {
      const pr = playlistProgress(p)
      return { id: p.id, name: playlistDisplayName(p), subject_name: p.subject_name, watched: pr.watched, total: pr.total }
    })
}
