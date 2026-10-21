import { istanbulDateStr } from "@/lib/tz"
import { formatSpan } from "@/lib/resources/video-match"
import { playlistDisplayName, type PlaylistRow, type VideoRow } from "@/lib/resources/videos"
import { effectiveStatus, playlistProgress } from "@/lib/resources/video-summary"

// "Ne izlemeliyim?" — kural tabanlı öncelik (AI yok). Ağırlıklar burada,
// tek yerden değişir. Skor = ilgili kuralların toplamı; her kural gerekçe yazar.

export const VIDEO_PRIORITY_WEIGHTS = {
  /** Bu haftaki programda (tamamlanmamış kalem) konusu olan video. */
  program: 50,
  /** Açık hedef (aktif) konusu. */
  goal: 30,
  /** Yol haritasında sıradaki konu. */
  queued: 18,
  /** Zayıf konu (ustalık düşük ya da yanlış defterinde kayıt). */
  weak: 25,
  /** Dersin son izlemesinden bu yana geçen gün başına. */
  stalePerDay: 2,
  staleMax: 28,
  /** Bu günden az ise gerekçe yazılmaz (skora yine girer). */
  staleReasonMinDays: 3,
  /** Kalan süresi bu eşiğin altındaki playlist "bitmek üzere". */
  nearlyDone: 15,
  nearlyDoneSeconds: 2 * 3600,
  /** Playlist'in sıradaki videosu (sıra bozulmasın diye küçük artı). */
  nextInOrder: 5,
  maxSuggestions: 5,
} as const

export type PriorityContext = {
  /** Konu → ad: bu haftaki programda tamamlanmamış kalem. */
  programTopics: Map<string, string>
  /** Konu → ad: aktif hedefler. */
  goalTopics: Map<string, string>
  /** Konu → ad: yol haritasında sırada. */
  queuedTopics: Map<string, string>
  /** Konu → zayıflık bilgisi. */
  weakTopics: Map<string, { name: string; wrongCount: number; mastery: number | null }>
}

export type VideoSuggestion = {
  video: VideoRow
  playlistId: string
  playlistName: string
  subjectName: string
  score: number
  reasons: string[]
}

function daysBetween(fromIso: string, toDay: string): number {
  const a = Date.parse(`${istanbulDateStr(new Date(fromIso))}T00:00:00Z`)
  const b = Date.parse(`${toDay}T00:00:00Z`)
  return Math.max(0, Math.round((b - a) / 86_400_000))
}

export function prioritizeVideos(playlists: PlaylistRow[], ctx: PriorityContext, now: Date = new Date()): VideoSuggestion[] {
  const W = VIDEO_PRIORITY_WEIGHTS
  const today = istanbulDateStr(now)

  // Dersin son izleme anı (tüm playlist'ler, duraklatılanlar dahil).
  const lastBySubject = new Map<string, string>()
  for (const p of playlists) {
    for (const v of p.videos) {
      if (!v.watched_at) continue
      const cur = lastBySubject.get(p.subject_id)
      if (!cur || v.watched_at > cur) lastBySubject.set(p.subject_id, v.watched_at)
    }
  }

  const out: VideoSuggestion[] = []
  for (const p of playlists) {
    if (effectiveStatus(p) !== "aktif") continue
    const pr = playlistProgress(p)
    const last = lastBySubject.get(p.subject_id)
    const staleDays = last ? daysBetween(last, today) : null
    const staleScore = Math.min(W.staleMax, (staleDays ?? W.staleMax / W.stalePerDay) * W.stalePerDay)
    const nearlyDone = pr.remainingUnknown === 0 && pr.remainingSeconds > 0 && pr.remainingSeconds <= W.nearlyDoneSeconds

    for (const v of p.videos) {
      if (v.watch_status === "izlendi") continue
      const isNext = pr.next?.id === v.id
      const topic = v.topic_id && v.match_status !== "eslesmedi" ? v.topic_id : null
      const inProgram = topic ? ctx.programTopics.get(topic) : undefined
      const inGoal = topic ? ctx.goalTopics.get(topic) : undefined
      const inQueue = topic ? ctx.queuedTopics.get(topic) : undefined
      const weak = topic ? ctx.weakTopics.get(topic) : undefined
      // Konu sinyali yoksa yalnız playlist'in sıradaki videosu aday.
      if (!isNext && !inProgram && !inGoal && !inQueue && !weak) continue

      let score = staleScore
      const reasons: string[] = []
      if (inProgram) {
        score += W.program
        reasons.push(`Programında bu hafta ${inProgram} var`)
      }
      if (inGoal) {
        score += W.goal
        if (!inProgram) reasons.push(`${inGoal} açık hedeflerinde`)
      } else if (inQueue) {
        score += W.queued
        if (!inProgram) reasons.push(`Yol haritanda sıradaki konu: ${inQueue}`)
      }
      if (weak) {
        score += W.weak
        reasons.push(
          weak.wrongCount > 0
            ? `${weak.name} konusunda yanlış defterinde ${weak.wrongCount} kayıt var`
            : `${weak.name} konusunda başarın düşük görünüyor${weak.mastery != null ? ` (%${Math.round(weak.mastery)})` : ""}`,
        )
      }
      if (staleDays === null) reasons.push(`${p.subject_name} dersinde henüz video izlemedin`)
      else if (staleDays >= W.staleReasonMinDays) reasons.push(`${p.subject_name} dersinde ${staleDays} gündür video izlemedin`)
      if (isNext) {
        score += W.nextInOrder
        if (nearlyDone) {
          score += W.nearlyDone
          reasons.push(`Playlist bitmek üzere (kalan ${formatSpan(pr.remainingSeconds)})`)
        }
      }
      if (reasons.length === 0) reasons.push("Playlist'te sıradaki video")
      out.push({ video: v, playlistId: p.id, playlistName: playlistDisplayName(p), subjectName: p.subject_name, score, reasons })
    }
  }

  // Aynı playlist'ten en fazla 2 öneri; çeşitlilik için.
  out.sort((a, b) => b.score - a.score || a.video.position - b.video.position)
  const perList = new Map<string, number>()
  const picked: VideoSuggestion[] = []
  for (const s of out) {
    const n = perList.get(s.playlistId) ?? 0
    if (n >= 2) continue
    perList.set(s.playlistId, n + 1)
    picked.push(s)
    if (picked.length >= W.maxSuggestions) break
  }
  return picked
}
