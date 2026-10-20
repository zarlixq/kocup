import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"
import { TEACHER_STATS_MIN_QUESTIONS } from "@/lib/upplan/config"
import { teacherStats, videosCompleteLearning, type TeacherStat } from "@/lib/resources/video-match"

type Client = SupabaseClient<Database>

// Kaynaklarım → video playlist'leri. Okuma çağıranın client'ıyla (RLS).
// YouTube Data API yalnız sunucuda (YOUTUBE_API_KEY); yoksa elle liste.

export type VideoRow = {
  id: string
  playlist_id: string
  youtube_video_id: string
  title: string
  position: number
  topic_id: string | null
  topic_name: string | null
  match_status: "oneri" | "onaylandi" | "eslesmedi"
  watch_status: "izlenmedi" | "izlendi"
  understanding: "anladim" | "kismen" | "anlamadim" | null
}

export type PlaylistRow = {
  id: string
  subject_id: string
  subject_name: string
  teacher_name: string
  title: string | null
  source: "youtube" | "manuel"
  videos: VideoRow[]
}

/** Konu başına video grubu: "Bıyıklı Matematik – Ardışık Sayılar (2 video)". */
export type TopicVideoGroup = {
  playlist_id: string
  teacher_name: string
  videos: Pick<VideoRow, "id" | "youtube_video_id" | "title" | "watch_status" | "understanding">[]
}
export type TopicVideos = Record<string, TopicVideoGroup[]>

export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`
}

export function youtubeEnabled(): boolean {
  return !!process.env.YOUTUBE_API_KEY
}

const asMatch = (v: string): VideoRow["match_status"] => (v === "oneri" || v === "onaylandi" ? v : "eslesmedi")
const asWatch = (v: string): VideoRow["watch_status"] => (v === "izlendi" ? "izlendi" : "izlenmedi")
const asUnderstanding = (v: string | null): VideoRow["understanding"] =>
  v === "anladim" || v === "kismen" || v === "anlamadim" ? v : null

export async function loadPlaylists(db: Client, studentId: string): Promise<PlaylistRow[]> {
  const [{ data: lists }, { data: videos }] = await Promise.all([
    db
      .from("student_resource_playlists")
      .select("id, subject_id, teacher_name, title, source, subjects(name)")
      .eq("student_id", studentId)
      .order("created_at"),
    db
      .from("student_resource_videos")
      .select("id, playlist_id, youtube_video_id, title, position, topic_id, match_status, watch_status, understanding, topics(name)")
      .eq("student_id", studentId)
      .order("position")
      .range(0, 4999),
  ])
  const byList = new Map<string, VideoRow[]>()
  for (const v of videos ?? []) {
    const row: VideoRow = {
      id: v.id,
      playlist_id: v.playlist_id,
      youtube_video_id: v.youtube_video_id,
      title: v.title,
      position: v.position,
      topic_id: v.topic_id,
      topic_name: v.topics?.name ?? null,
      match_status: asMatch(v.match_status),
      watch_status: asWatch(v.watch_status),
      understanding: asUnderstanding(v.understanding),
    }
    ;(byList.get(v.playlist_id) ?? byList.set(v.playlist_id, []).get(v.playlist_id)!).push(row)
  }
  return (lists ?? []).map((l) => ({
    id: l.id,
    subject_id: l.subject_id,
    subject_name: l.subjects?.name ?? "—",
    teacher_name: l.teacher_name,
    title: l.title,
    source: l.source === "manuel" ? "manuel" : "youtube",
    videos: byList.get(l.id) ?? [],
  }))
}

/** Konu → eşleşmiş videolar (öneri + onaylı), playlist (hoca) bazında. */
export function groupVideosByTopic(playlists: PlaylistRow[]): TopicVideos {
  const out: TopicVideos = {}
  for (const p of playlists) {
    for (const v of p.videos) {
      if (!v.topic_id || v.match_status === "eslesmedi") continue
      const groups = (out[v.topic_id] ??= [])
      let g = groups.find((x) => x.playlist_id === p.id)
      if (!g) {
        g = { playlist_id: p.id, teacher_name: p.teacher_name, videos: [] }
        groups.push(g)
      }
      g.videos.push({ id: v.id, youtube_video_id: v.youtube_video_id, title: v.title, watch_status: v.watch_status, understanding: v.understanding })
    }
  }
  return out
}

export async function loadTopicVideos(db: Client, studentId: string): Promise<TopicVideos> {
  return groupVideosByTopic(await loadPlaylists(db, studentId))
}

/** Hoca kartı: izlenen konularda sonrasında çözülen soruların doğruluğu. */
export async function loadTeacherStats(
  db: Client,
  studentId: string,
  playlists: PlaylistRow[],
): Promise<(TeacherStat & { teacher_name: string })[]> {
  const topicIds = Array.from(new Set(playlists.flatMap((p) => p.videos.map((v) => v.topic_id)).filter((x): x is string => !!x)))
  if (topicIds.length === 0) return []
  const [{ data: videos }, { data: sessions }] = await Promise.all([
    db.from("student_resource_videos").select("playlist_id, topic_id, watch_status, understanding, watched_at").eq("student_id", studentId),
    db
      .from("study_sessions")
      .select("topic_id, date, correct, total_questions")
      .eq("student_id", studentId)
      .in("topic_id", topicIds.slice(0, 300)),
  ])
  const names = new Map(playlists.map((p) => [p.id, p.teacher_name]))
  return teacherStats(videos ?? [], sessions ?? [], TEACHER_STATS_MIN_QUESTIONS)
    .filter((s) => s.watched > 0)
    .map((s) => ({ ...s, teacher_name: names.get(s.playlist_id) ?? "—" }))
}

/** Konunun eşleşmiş videoları öğrenme aşamasını bitirdi mi. */
export async function topicVideosComplete(db: Client, studentId: string, topicId: string): Promise<boolean> {
  const { data } = await db
    .from("student_resource_videos")
    .select("watch_status, understanding")
    .eq("student_id", studentId)
    .eq("topic_id", topicId)
    .in("match_status", ["oneri", "onaylandi"])
  return videosCompleteLearning(data ?? [])
}

// ── YouTube Data API v3 ─────────────────────────────────────────────────
const YT = "https://www.googleapis.com/youtube/v3"
const MAX_VIDEOS = 300

export async function fetchYoutubePlaylist(
  playlistId: string,
): Promise<{ title: string | null; videos: { videoId: string; title: string; position: number }[] } | { error: string }> {
  const key = process.env.YOUTUBE_API_KEY
  if (!key) return { error: "YouTube bağlantısı tanımlı değil; videoları elle gir." }
  try {
    const meta = await fetch(`${YT}/playlists?part=snippet&id=${encodeURIComponent(playlistId)}&key=${key}`, { cache: "no-store" })
    if (!meta.ok) return { error: "Playlist okunamadı; linki kontrol et." }
    const metaJson = (await meta.json()) as { items?: { snippet?: { title?: string } }[] }
    if (!metaJson.items?.length) return { error: "Playlist bulunamadı ya da gizli." }
    const videos: { videoId: string; title: string; position: number }[] = []
    let page: string | undefined
    do {
      const res = await fetch(
        `${YT}/playlistItems?part=snippet&maxResults=50&playlistId=${encodeURIComponent(playlistId)}&key=${key}${page ? `&pageToken=${page}` : ""}`,
        { cache: "no-store" },
      )
      if (!res.ok) return { error: "Playlist videoları okunamadı." }
      const json = (await res.json()) as {
        nextPageToken?: string
        items?: { snippet?: { title?: string; position?: number; resourceId?: { videoId?: string } } }[]
      }
      for (const it of json.items ?? []) {
        const id = it.snippet?.resourceId?.videoId
        const title = it.snippet?.title
        // Silinmiş/gizli videolar atlanır.
        if (!id || !title || title === "Deleted video" || title === "Private video") continue
        videos.push({ videoId: id, title: title.slice(0, 200), position: it.snippet?.position ?? videos.length })
      }
      page = json.nextPageToken
    } while (page && videos.length < MAX_VIDEOS)
    return { title: metaJson.items[0].snippet?.title?.slice(0, 200) ?? null, videos }
  } catch (e) {
    console.error("fetchYoutubePlaylist", e)
    return { error: "YouTube'a bağlanılamadı, tekrar dene." }
  }
}
