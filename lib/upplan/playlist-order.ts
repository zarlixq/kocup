import { PLAYLIST_SUBJECT_MIN_TOPICS, PLAYLIST_TOPIC_BUFFER_DAYS } from "@/lib/upplan/config"

// Playlist konu sırası — saf fonksiyonlar (test edilir).
//
// KURAL: aktif çalışma planı olan ve "konu sırasını belirlesin" açık playlist,
// videolarının eşlendiği konularda (kapsam) yol haritası ve haftalık programın
// konu sırasını belirler. Kapsam konu bazlıdır: playlist'in dersi dışındaki
// konular da (ör. TYT Matematik playlist'inde Geometri) eşlendiyse kapsamdadır.
// Konunun sırası = ilk videosunun plan günü; iki playlist aynı konuyu
// kapsıyorsa daha erken başlayan geçerlidir.
// Kapsamdaki DERS = playlist'in dersi + playlist'in en az
// PLAYLIST_SUBJECT_MIN_TOPICS konusunu kapsadığı diğer dersler. Bu derslerin
// playlist'te eşlenmemiş konuları playlist bitene kadar başlamaz (o dersin
// haftalık programına yalnız playlist günlerinin konuları girer).

export type ScopeVideo = {
  topic_id: string | null
  match_status: string
  plan_day: number | null
  planned_date: string | null
  watch_status: string
  position: number
  /** Eşlenen konunun dersi. */
  subject_id?: string | null
}

export type ScopePlaylist = {
  id: string
  /** Kanal / hoca adı: "Bıyıklı Matematik". */
  name: string
  subject_id: string
  kind: "playlist" | "tekli"
  status: string
  /** Çalışma planı kurulu mu (plan_mode). */
  planned: boolean
  order_topics: boolean
  videos: ScopeVideo[]
}

export type PlaylistTopic = {
  playlist_id: string
  playlist_name: string
  /** Konunun ilk videosunun plan günü (izlenip plandan çıkmışsa null). */
  day: number | null
  /** Konunun en erken plan tarihi (tarihli video yoksa null). */
  start: string | null
  /** Konunun en geç plan tarihi. */
  last: string | null
  /** Konunun en az bir videosu izlendi (konu başlamış sayılır). */
  started: boolean
  /** İlk videosu izlenmediyse plan tarihi: soru blokları bu günden önce konmaz. */
  notBefore: string | null
}

/** topic_id → playlist bilgisi. */
export type PlaylistScope = Record<string, PlaylistTopic>

/** Kapsamdaki ders: eşlenmemiş konuları `until` (playlist'in son plan günü) sonrasına kalır. */
export type PlaylistSubject = { playlist_name: string; until: string }
export type PlaylistSubjects = Record<string, PlaylistSubject>

/** Öğrencinin playlist bağlamı (DB'den: loadPlaylistScope). */
export type PlaylistContext = { topics: PlaylistScope; subjects: PlaylistSubjects }

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Sıralama anahtarı: başlamış (ya da tarihsiz) konu en önde. */
function sortKey(t: PlaylistTopic): string {
  return t.started || !t.start ? "0000-00-00" : t.start
}

/** Konu sırasını belirleyen playlist'ler: aktif, planlı, seçenek açık. */
export function ordersTopics(p: Pick<ScopePlaylist, "kind" | "status" | "planned" | "order_topics">): boolean {
  return p.kind === "playlist" && p.status === "aktif" && p.planned && p.order_topics
}

export function buildPlaylistScope(playlists: ScopePlaylist[]): PlaylistScope {
  const out: PlaylistScope = {}
  for (const p of playlists) {
    if (!ordersTopics(p)) continue
    const byTopic = new Map<string, ScopeVideo[]>()
    for (const v of p.videos) {
      if (!v.topic_id || v.match_status === "eslesmedi") continue
      ;(byTopic.get(v.topic_id) ?? byTopic.set(v.topic_id, []).get(v.topic_id)!).push(v)
    }
    for (const [topicId, list] of byTopic) {
      list.sort((a, b) => a.position - b.position)
      const dates = list.map((v) => v.planned_date).filter((d): d is string => !!d).sort()
      const days = list.map((v) => v.plan_day).filter((d): d is number => d !== null)
      const first = list[0]
      const t: PlaylistTopic = {
        playlist_id: p.id,
        playlist_name: p.name,
        day: days.length ? Math.min(...days) : null,
        start: dates[0] ?? null,
        last: dates.at(-1) ?? null,
        started: list.some((v) => v.watch_status === "izlendi"),
        notBefore: first.watch_status === "izlendi" ? null : first.planned_date,
      }
      const cur = out[topicId]
      // Çakışma: daha erken başlayan; eşitse küçük plan günü; o da eşitse ilk gelen.
      if (!cur || sortKey(t) < sortKey(cur) || (sortKey(t) === sortKey(cur) && (t.day ?? 0) < (cur.day ?? 0))) out[topicId] = t
    }
  }
  return out
}

/**
 * Kapsamdaki dersler: playlist'in dersi + en az `minTopics` konusunun eşlendiği
 * dersler. Bitiş = playlist'in izlenmemiş son plan günü (birden çok playlist → en geç).
 * Bütün videoları izlenmiş / tarihsiz playlist dersi bekletmez.
 */
export function buildPlaylistSubjects(playlists: ScopePlaylist[], minTopics = PLAYLIST_SUBJECT_MIN_TOPICS): PlaylistSubjects {
  const out: PlaylistSubjects = {}
  for (const p of playlists) {
    if (!ordersTopics(p)) continue
    const until = p.videos
      .filter((v) => v.watch_status !== "izlendi" && v.planned_date)
      .reduce<string | null>((m, v) => (!m || v.planned_date! > m ? v.planned_date : m), null)
    if (!until) continue
    const topicsBySubject = new Map<string, Set<string>>()
    for (const v of p.videos) {
      if (!v.topic_id || !v.subject_id || v.match_status === "eslesmedi") continue
      ;(topicsBySubject.get(v.subject_id) ?? topicsBySubject.set(v.subject_id, new Set()).get(v.subject_id)!).add(v.topic_id)
    }
    const subjects = new Set([p.subject_id])
    for (const [sid, ids] of topicsBySubject) if (ids.size >= minTopics) subjects.add(sid)
    for (const sid of subjects) {
      const cur = out[sid]
      if (!cur || until > cur.until) out[sid] = { playlist_name: p.name, until }
    }
  }
  return out
}

/** Kapsamdaki derste playlist'te olmayan konu en erken bu gün başlar (yoksa null). */
export function coveredNotBefore(subjects: PlaylistSubjects, subjectId: string): string | null {
  const s = subjects[subjectId]
  return s ? addDays(s.until, 1) : null
}

/** Konunun playlist günü geldi mi (ya da başladı mı). */
export function playlistReached(t: PlaylistTopic, today: string): boolean {
  return t.started || !t.start || t.start <= today
}

/**
 * Kapsamdaki konunun hedef tarihleri: başlangıç = ilk videonun plan tarihi,
 * bitiş = son videonun plan tarihi + PLAYLIST_TOPIC_BUFFER_DAYS (soru çözümü
 * tamponu); bitiş bugünden ve başlangıçtan erken olmaz, sınav tarihini aşmaz.
 */
export function playlistGoalDates(
  t: PlaylistTopic,
  today: string,
  examDate?: string,
  buffer = PLAYLIST_TOPIC_BUFFER_DAYS,
): { start: string; end: string; reached: boolean } {
  const reached = playlistReached(t, today)
  const start = t.start ?? today
  let end = addDays(t.last ?? start, buffer)
  if (end < today) end = today
  if (end < start) end = start
  if (examDate && end > examDate) end = examDate < start ? start : examDate
  return { start, end, reached }
}

/** Kart: "Bıyıklı Matematik · 3. Gün". */
export function playlistTopicLabel(t: Pick<PlaylistTopic, "playlist_name" | "day">): string {
  return t.day ? `${t.playlist_name} · ${t.day}. Gün` : t.playlist_name
}

/** Program bloğu: "Bıyıklı 3. Gün" (kanal adının ilk kelimesi). */
export function playlistShortLabel(t: Pick<PlaylistTopic, "playlist_name" | "day">): string {
  const first = t.playlist_name.trim().split(/\s+/)[0] || t.playlist_name
  return t.day ? `${first} ${t.day}. Gün` : first
}
