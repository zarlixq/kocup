import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"
import { TEACHER_STATS_MIN_QUESTIONS } from "@/lib/upplan/config"
import { teacherStats, videosCompleteLearning, type TeacherStat } from "@/lib/resources/video-match"
import { ALL_WEEKDAYS, type PlanMode } from "@/lib/resources/playlist-plan"

type Client = SupabaseClient<Database>

// Kaynaklarım → video takip. Okuma çağıranın client'ıyla (RLS: öğrenci kendisi,
// koç aynı kurumdaki kendi öğrencisi). YouTube erişimi lib/resources/youtube.ts.
// Tekli videolar ders başına bir "tekli" grup satırında tutulur (kind='tekli').

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
  watched_at: string | null
  duration_seconds: number | null
  thumbnail_url: string | null
  note: string | null
  plan_day: number | null
  planned_date: string | null
}

export type PlaylistStatus = "aktif" | "duraklatildi" | "tamamlandi"

export type PlaylistRow = {
  id: string
  kind: "playlist" | "tekli"
  subject_id: string
  subject_name: string
  subject_color: string | null
  teacher_name: string
  title: string | null
  source: "youtube" | "manuel"
  status: PlaylistStatus
  youtube_playlist_id: string | null
  thumbnail_url: string | null
  last_synced_at: string | null
  channel_title: string | null
  /** 'kanal_linki': kanal linkiyle eklenmiş eksik kayıt → "Düzelt". */
  issue: "kanal_linki" | null
  plan: PlaylistPlan | null
  videos: VideoRow[]
}

export type PlaylistPlan = { mode: PlanMode; amount: number | null; start: string; weekdays: number[] }

export const TEKLI_GROUP_NAME = "Tekli videolar"

/** Konu başına video grubu: "Bıyıklı Matematik – Ardışık Sayılar (2 video)". */
export type TopicVideoGroup = {
  playlist_id: string
  teacher_name: string
  videos: Pick<VideoRow, "id" | "youtube_video_id" | "title" | "watch_status" | "understanding" | "duration_seconds">[]
}
export type TopicVideos = Record<string, TopicVideoGroup[]>

export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`
}

const CHANNEL_URL_RE = /youtube\.com\/(@[^/?#\s]+|channel\/[^/?#\s]+|c\/[^/?#\s]+|user\/[^/?#\s]+)/i

/** Eski kayıtlarda hoca adı yerine yapıştırılmış kanal linki → "@kanal". */
export function looksLikeUrl(s: string | null | undefined): boolean {
  return !!s && /https?:\/\/|youtube\.com|youtu\.be/i.test(s)
}

/** Kanal / hoca adı: YouTube kanal adı > elle yazılan ad > linkten çıkan @ad. */
export function teacherDisplayName(p: Pick<PlaylistRow, "channel_title" | "teacher_name">): string {
  if (p.channel_title?.trim()) return p.channel_title.trim()
  if (!looksLikeUrl(p.teacher_name)) return p.teacher_name
  const m = p.teacher_name.match(CHANNEL_URL_RE)
  return m ? decodeURIComponent(m[1].split("/").pop() ?? m[1]) : "YouTube kanalı"
}

/** Kayıttaki kanal linki (Düzelt akışı için), yoksa null. */
export function channelUrlOf(p: Pick<PlaylistRow, "teacher_name" | "title">): string | null {
  for (const s of [p.teacher_name, p.title ?? ""]) {
    const m = s.match(CHANNEL_URL_RE)
    if (m) return `https://www.youtube.com/${m[1]}`
  }
  return null
}

export function playlistDisplayName(
  p: Pick<PlaylistRow, "kind" | "title" | "teacher_name" | "subject_name"> & Partial<Pick<PlaylistRow, "channel_title">>,
): string {
  if (p.kind === "tekli") return `${p.subject_name} · ${TEKLI_GROUP_NAME}`
  if (p.title?.trim() && !looksLikeUrl(p.title)) return p.title.trim()
  return teacherDisplayName({ channel_title: p.channel_title ?? null, teacher_name: p.teacher_name })
}

/** Liste satırı: "55 Günde TYT Matematik Kampı · Bıyıklı Matematik · 118 video". */
export function playlistSubtitle(p: PlaylistRow): string {
  const name = playlistDisplayName(p)
  const teacher = p.kind === "tekli" ? null : teacherDisplayName(p)
  return [teacher && teacher !== name ? teacher : null, `${p.videos.length} video`].filter(Boolean).join(" · ")
}

const asMatch = (v: string): VideoRow["match_status"] => (v === "oneri" || v === "onaylandi" ? v : "eslesmedi")
const asWatch = (v: string): VideoRow["watch_status"] => (v === "izlendi" ? "izlendi" : "izlenmedi")
const asUnderstanding = (v: string | null): VideoRow["understanding"] =>
  v === "anladim" || v === "kismen" || v === "anlamadim" ? v : null
const asStatus = (v: string): PlaylistStatus => (v === "duraklatildi" || v === "tamamlandi" ? v : "aktif")
const asPlanMode = (v: string | null): PlanMode | null => (v === "gun_yapisi" || v === "video" || v === "dakika" ? v : null)

export async function loadPlaylists(db: Client, studentId: string): Promise<PlaylistRow[]> {
  const [{ data: lists, error: le }, { data: videos, error: ve }] = await Promise.all([
    db
      .from("student_resource_playlists")
      .select("id, kind, subject_id, teacher_name, title, source, status, youtube_playlist_id, thumbnail_url, last_synced_at, channel_title, issue, plan_mode, plan_amount, plan_start, plan_weekdays, subjects(name, color)")
      .eq("student_id", studentId)
      .order("created_at"),
    db
      .from("student_resource_videos")
      .select(
        "id, playlist_id, youtube_video_id, title, position, topic_id, match_status, watch_status, understanding, watched_at, duration_seconds, thumbnail_url, note, plan_day, planned_date, topics(name)",
      )
      .eq("student_id", studentId)
      .order("position")
      .range(0, 4999),
  ])
  if (le || ve) console.error("loadPlaylists", le ?? ve)
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
      watched_at: v.watched_at,
      duration_seconds: v.duration_seconds,
      thumbnail_url: v.thumbnail_url,
      note: v.note,
      plan_day: v.plan_day,
      planned_date: v.planned_date,
    }
    ;(byList.get(v.playlist_id) ?? byList.set(v.playlist_id, []).get(v.playlist_id)!).push(row)
  }
  return (lists ?? []).map((l) => ({
    id: l.id,
    kind: l.kind === "tekli" ? "tekli" : "playlist",
    subject_id: l.subject_id,
    subject_name: l.subjects?.name ?? "—",
    subject_color: l.subjects?.color ?? null,
    teacher_name: l.teacher_name,
    title: l.title,
    source: l.source === "manuel" ? "manuel" : "youtube",
    status: asStatus(l.status),
    youtube_playlist_id: l.youtube_playlist_id,
    thumbnail_url: l.thumbnail_url,
    last_synced_at: l.last_synced_at,
    channel_title: l.channel_title,
    issue: l.issue === "kanal_linki" ? "kanal_linki" : null,
    plan: (() => {
      const mode = asPlanMode(l.plan_mode)
      return mode && l.plan_start
        ? { mode, amount: l.plan_amount, start: l.plan_start, weekdays: l.plan_weekdays?.length ? l.plan_weekdays : [...ALL_WEEKDAYS] }
        : null
    })(),
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
        g = { playlist_id: p.id, teacher_name: p.kind === "tekli" ? TEKLI_GROUP_NAME : teacherDisplayName(p), videos: [] }
        groups.push(g)
      }
      g.videos.push({
        id: v.id,
        youtube_video_id: v.youtube_video_id,
        title: v.title,
        watch_status: v.watch_status,
        understanding: v.understanding,
        duration_seconds: v.duration_seconds,
      })
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
  const real = playlists.filter((p) => p.kind === "playlist")
  const topicIds = Array.from(new Set(real.flatMap((p) => p.videos.map((v) => v.topic_id)).filter((x): x is string => !!x)))
  if (topicIds.length === 0) return []
  const { data: sessions } = await db
    .from("study_sessions")
    .select("topic_id, date, correct, total_questions")
    .eq("student_id", studentId)
    .in("topic_id", topicIds.slice(0, 300))
  const videos = real.flatMap((p) =>
    p.videos.map((v) => ({ playlist_id: p.id, topic_id: v.topic_id, watch_status: v.watch_status, understanding: v.understanding, watched_at: v.watched_at })),
  )
  const names = new Map(real.map((p) => [p.id, teacherDisplayName(p)]))
  return teacherStats(videos, sessions ?? [], TEACHER_STATS_MIN_QUESTIONS)
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
