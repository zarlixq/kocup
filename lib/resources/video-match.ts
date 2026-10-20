import { VIDEO_MATCH_MIN_SCORE } from "@/lib/upplan/config"
import { normalizeTr } from "@/lib/yanlis-defteri/atom-search"

// Video playlist ↔ konu eşleştirme ve hoca etkinliği — saf fonksiyonlar (test edilir).
// Telif: video içeriği indirilmez/kopyalanmaz; yalnız YouTube kimliği ve başlığı.

const ID_RE = /^[A-Za-z0-9_-]{11}$/

/** youtube.com/playlist?list=… ya da izleme linkindeki list= → playlist kimliği. */
export function parseYoutubePlaylistId(input: string): string | null {
  const s = input.trim()
  const m = s.match(/[?&]list=([A-Za-z0-9_-]{10,64})/)
  if (m) return m[1]
  return /^[A-Za-z0-9_-]{10,64}$/.test(s) && !ID_RE.test(s) ? s : null
}

/** watch?v=, youtu.be/, shorts/, embed/ → 11 karakterlik video kimliği. */
export function parseYoutubeVideoId(input: string): string | null {
  const m = input.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/)
  return m ? m[1] : null
}

export type ManualVideo = { videoId: string; title: string; position: number }

/**
 * Elle liste: her satırda bir YouTube linki ve (isteğe bağlı) başlık, ör.
 *   "https://youtu.be/abc… Ardışık Sayılar 1" ya da "Ardışık Sayılar | https://…".
 * Linksiz satır atlanır; başlık yoksa "Video N".
 */
export function parseManualVideoList(text: string): ManualVideo[] {
  const out: ManualVideo[] = []
  const seen = new Set<string>()
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    const url = line.match(/https?:\/\/\S+/)?.[0]
    const id = url ? parseYoutubeVideoId(url) : null
    if (!id || seen.has(id)) continue
    seen.add(id)
    const title = line
      .replace(url!, " ")
      .replace(/^[\s|\-–—:;,]+|[\s|\-–—:;,]+$/g, "")
      .trim()
    out.push({ videoId: id, title: (title || `Video ${out.length + 1}`).slice(0, 200), position: out.length })
  }
  return out
}

// Konu adında anlamı zayıf kelimeler (eşleşmede sayılmaz).
const STOPWORDS = new Set(["ve", "ile", "ii", "i", "1", "2", "3", "tyt", "ayt", "konu", "giris", "temel"])

function tokens(s: string): string[] {
  return normalizeTr(s)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
}

/** Türkçe ek toleransı: kelime kökünün ilk (uzunluk−2, en az 4) harfi. */
function stem(t: string): string {
  return t.length <= 4 ? t : t.slice(0, Math.max(4, t.length - 2))
}

/**
 * Başlık ↔ konu benzerliği (0..1): konu adının kelimelerinden kaçı başlıkta
 * (kök eşleşmesiyle) geçiyor. Konu adı başlıkta aynen geçiyorsa 1.
 */
export function titleTopicScore(title: string, topicName: string): number {
  const nt = normalizeTr(title)
  const nn = normalizeTr(topicName)
  if (nn.length > 2 && nt.includes(nn)) return 1
  const tt = tokens(topicName)
  if (tt.length === 0) return 0
  const words = tokens(title)
  const hit = tt.filter((t) => words.some((w) => w.startsWith(stem(t)) || t.startsWith(stem(w)))).length
  return Math.round((hit / tt.length) * 1000) / 1000
}

/** En iyi konu (eşikten düşükse null). Eşitlikte adı uzun (daha özgül) konu. */
export function matchVideoTopic(
  title: string,
  topics: { id: string; name: string }[],
  minScore = VIDEO_MATCH_MIN_SCORE,
): { topic_id: string; score: number } | null {
  let best: { topic_id: string; score: number; len: number } | null = null
  for (const t of topics) {
    const score = titleTopicScore(title, t.name)
    if (score < minScore) continue
    if (!best || score > best.score || (score === best.score && t.name.length > best.len)) {
      best = { topic_id: t.id, score, len: t.name.length }
    }
  }
  return best ? { topic_id: best.topic_id, score: best.score } : null
}

// ── Hoca etkinliği ──────────────────────────────────────────────────────
export type TeacherVideo = {
  playlist_id: string
  topic_id: string | null
  watch_status: string
  understanding: string | null
  watched_at: string | null
}
export type TopicSession = { topic_id: string | null; date: string; correct: number; total_questions: number }

export type TeacherStat = {
  playlist_id: string
  watched: number
  understoodRate: number | null
  questions: number
  accuracy: number | null
  enoughData: boolean
}

/**
 * Her playlist için: izlenen videoların konularında, İZLEDİKTEN SONRA çözülen
 * soruların doğruluğu ve "anladım" oranı. Soru sayısı minQuestions altındaysa
 * yetersiz veri. Aynı soru kaydı bir playlist içinde bir kez sayılır.
 */
export function teacherStats(videos: TeacherVideo[], sessions: TopicSession[], minQuestions: number): TeacherStat[] {
  const byPlaylist = new Map<string, TeacherVideo[]>()
  for (const v of videos) (byPlaylist.get(v.playlist_id) ?? byPlaylist.set(v.playlist_id, []).get(v.playlist_id)!).push(v)
  const out: TeacherStat[] = []
  for (const [playlist_id, list] of byPlaylist) {
    const watched = list.filter((v) => v.watch_status === "izlendi")
    const rated = watched.filter((v) => v.understanding)
    // Konu → ilk izlenme tarihi.
    const firstWatch = new Map<string, string>()
    for (const v of watched) {
      if (!v.topic_id || !v.watched_at) continue
      const d = v.watched_at.slice(0, 10)
      const cur = firstWatch.get(v.topic_id)
      if (!cur || d < cur) firstWatch.set(v.topic_id, d)
    }
    let q = 0
    let c = 0
    for (const s of sessions) {
      const from = s.topic_id ? firstWatch.get(s.topic_id) : undefined
      if (!from || s.date < from) continue
      q += s.total_questions
      c += s.correct
    }
    out.push({
      playlist_id,
      watched: watched.length,
      understoodRate: rated.length ? Math.round((rated.filter((v) => v.understanding === "anladim").length / rated.length) * 100) : null,
      questions: q,
      accuracy: q > 0 ? Math.round((c / q) * 100) : null,
      enoughData: q >= minQuestions,
    })
  }
  return out
}

/** Konunun öğrenme aşaması videolarla bitti mi: en az bir video ve hepsi izlendi + anladım/kısmen. */
export function videosCompleteLearning(videos: { watch_status: string; understanding: string | null }[]): boolean {
  return (
    videos.length > 0 &&
    videos.every((v) => v.watch_status === "izlendi" && (v.understanding === "anladim" || v.understanding === "kismen"))
  )
}
