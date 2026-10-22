import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"
import { fetchActiveTopics } from "@/lib/curriculum/active-topics"
import { isPlaceholderTitle } from "@/lib/resources/video-match"
import { matchPlaylistVideos, type MatchTopic, type TopicCorrection } from "@/lib/resources/video-topic-match"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getPlaylist, type YoutubePlaylistMeta } from "@/lib/resources/youtube"
import { RELATED_VIDEO_SUBJECTS } from "@/lib/upplan/config"

type Client = SupabaseClient<Database>

// YouTube listesi ↔ DB video satırları (öğrencinin oturum client'ıyla; RLS).
// Server action'lar ve uçtan uca test aynı fonksiyonları kullanır.

export type NewVideo = { videoId: string; title: string; position: number; durationSeconds: number | null; thumbnailUrl: string }
export type VideoPatch = { title?: string; duration_seconds?: number; thumbnail_url?: string; position?: number }

/** Eşleştirme adayları: playlist'in dersi + kardeş dersler (RELATED_VIDEO_SUBJECTS). */
export async function loadMatchTopics(db: Client, subjectId: string): Promise<MatchTopic[]> {
  const { data: subjects } = await db.from("subjects").select("id, name")
  const name = subjects?.find((s) => s.id === subjectId)?.name ?? ""
  const relatedIds = (subjects ?? []).filter((s) => (RELATED_VIDEO_SUBJECTS[name] ?? []).includes(s.name)).map((s) => s.id)
  const lists = await Promise.all([subjectId, ...relatedIds].map((id) => fetchActiveTopics(db, { subjectId: id })))
  return lists.flatMap((list, i) => list.map((t) => ({ id: t.id, name: t.name, own: i === 0 })))
}

/** Aynı YouTube playlist'i için öğrenci düzeltmeleri (global; yalnız service role okur). */
export async function loadTopicCorrections(youtubePlaylistId: string | null): Promise<TopicCorrection[]> {
  if (!youtubePlaylistId) return []
  const { data, error } = await supabaseAdmin()
    .from("youtube_video_topic_corrections")
    .select("youtube_video_id, topic_id, updated_at")
    .eq("youtube_playlist_id", youtubePlaylistId)
    .range(0, 4999)
  if (error) console.error("loadTopicCorrections", error)
  return data ?? []
}

/**
 * Öğrencinin elle eşleştirmesini global öneri tablosuna yazar (playlist + video
 * + öğrenci başına son karar; topic_id null = konusuz). Tekli videolar ve
 * YouTube'a bağlı olmayan playlist'ler atlanır. Best-effort.
 */
export async function recordTopicCorrections(studentId: string, videoIds: string[]): Promise<void> {
  if (videoIds.length === 0) return
  const admin = supabaseAdmin()
  const { data, error } = await admin
    .from("student_resource_videos")
    .select("youtube_video_id, topic_id, match_status, student_resource_playlists!inner(kind, youtube_playlist_id)")
    .eq("student_id", studentId)
    .in("id", videoIds)
  if (error) return void console.error("recordTopicCorrections", error)
  const rows = (data ?? [])
    .filter((v) => v.student_resource_playlists.kind === "playlist" && v.student_resource_playlists.youtube_playlist_id)
    .map((v) => ({
      youtube_playlist_id: v.student_resource_playlists.youtube_playlist_id!,
      youtube_video_id: v.youtube_video_id,
      student_id: studentId,
      topic_id: v.match_status === "eslesmedi" ? null : v.topic_id,
      updated_at: new Date().toISOString(),
    }))
  if (!rows.length) return
  const { error: ue } = await admin.from("youtube_video_topic_corrections").upsert(rows)
  if (ue) console.error("recordTopicCorrections upsert", ue)
}

/**
 * Videoları ekler (aynı playlist'te tekrar eden atlanır) + konu eşleştirmesi
 * (video-topic-match.ts): güvenli eşleşme bağlanır ('oneri'), güvensiz eşleşme
 * bağlanmaz, "onay bekliyor" önerisi olur (suggested_topic_id).
 */
export async function insertVideos(
  db: Client,
  studentId: string,
  playlistId: string,
  subjectId: string,
  videos: NewVideo[],
): Promise<{ inserted: number; matched: number; pending: number } | { error: string }> {
  if (videos.length === 0) return { inserted: 0, matched: 0, pending: 0 }
  const [topics, { data: list }] = await Promise.all([
    loadMatchTopics(db, subjectId),
    db.from("student_resource_playlists").select("kind, youtube_playlist_id").eq("id", playlistId).maybeSingle(),
  ])
  const corrections = list?.kind === "playlist" ? await loadTopicCorrections(list.youtube_playlist_id) : []
  const matches = matchPlaylistVideos(videos.map((v) => ({ videoId: v.videoId, title: v.title })), topics, corrections)
  let matched = 0
  let pending = 0
  const rows = videos.map((v) => {
    const m = matches.get(v.videoId) ?? null
    if (m?.confident) matched += 1
    else if (m) pending += 1
    return {
      student_id: studentId,
      playlist_id: playlistId,
      youtube_video_id: v.videoId,
      title: v.title,
      position: v.position,
      duration_seconds: v.durationSeconds,
      thumbnail_url: v.thumbnailUrl,
      topic_id: m?.confident ? m.topic_id : null,
      suggested_topic_id: m && !m.confident ? m.topic_id : null,
      match_status: m?.confident ? "oneri" : "eslesmedi",
      match_score: m?.score ?? null,
    }
  })
  const { data, error } = await db
    .from("student_resource_videos")
    .upsert(rows, { onConflict: "playlist_id,youtube_video_id", ignoreDuplicates: true })
    .select("id")
  if (error) {
    console.error("insertVideos", error)
    return { error: "Videolar kaydedilemedi." }
  }
  return { inserted: data?.length ?? 0, matched, pending }
}

/**
 * YouTube listesini DB ile eşitler: yeni videoları ekler, eksik süre/küçük
 * resim ve "Video N" başlıklarını tamamlar, sırayı günceller. YouTube'dan
 * kalkmış videolar silinmez, listenin sonuna alınır. İzleme işaretlerine dokunmaz.
 */
export async function syncYoutubeVideos(
  db: Client,
  studentId: string,
  playlistId: string,
  subjectId: string,
  yt: YoutubePlaylistMeta,
): Promise<{ added: number; patches: Map<string, VideoPatch> } | { error: string }> {
  const { data: current } = await db
    .from("student_resource_videos")
    .select("id, youtube_video_id, title, duration_seconds, thumbnail_url, position")
    .eq("playlist_id", playlistId)
    .order("position")
  const existing = current ?? []
  const byVideo = new Map(existing.map((v) => [v.youtube_video_id, v]))
  const fresh = yt.videos.filter((v) => !byVideo.has(v.videoId))
  const res = await insertVideos(db, studentId, playlistId, subjectId, fresh)
  if ("error" in res) return res
  const patches = new Map<string, VideoPatch>()
  for (const v of yt.videos) {
    const cur = byVideo.get(v.videoId)
    if (!cur) continue
    const p: VideoPatch = {}
    if (cur.duration_seconds == null && v.durationSeconds != null) p.duration_seconds = v.durationSeconds
    if (!cur.thumbnail_url) p.thumbnail_url = v.thumbnailUrl
    if (isPlaceholderTitle(cur.title)) p.title = v.title
    if (cur.position !== v.position) p.position = v.position
    if (Object.keys(p).length) patches.set(cur.id, p)
  }
  const inList = new Set(yt.videos.map((v) => v.videoId))
  existing
    .filter((v) => !inList.has(v.youtube_video_id))
    .forEach((v, i) => {
      const position = yt.videos.length + i
      if (v.position !== position) patches.set(v.id, { ...patches.get(v.id), position })
    })
  return { added: res.inserted, patches }
}

export async function writePatches(db: Client, studentId: string, patches: Map<string, VideoPatch>): Promise<void> {
  // Satır bazlı güncelleme (aynı playlist, en fazla birkaç yüz).
  const results = await Promise.all(
    Array.from(patches, ([id, p]) => db.from("student_resource_videos").update(p).eq("id", id).eq("student_id", studentId)),
  )
  const failed = results.find((r) => r.error)
  if (failed?.error) console.error("video patch", failed.error)
}

/**
 * Eksik kaydı (kanal linkiyle eklenmiş) seçilen YouTube playlist'ine bağlar:
 * başlık, kanal, kapak ve videolar gelir; mevcut videolar ve izleme işaretleri
 * korunur (silinmez), issue temizlenir.
 */
export async function linkPlaylistToYoutube(
  db: Client,
  studentId: string,
  playlistId: string,
  ytId: string,
): Promise<{ added: number; videos: number } | { error: string }> {
  const { data: list } = await db
    .from("student_resource_playlists")
    .select("id, subject_id, kind, youtube_playlist_id, teacher_name")
    .eq("id", playlistId)
    .eq("student_id", studentId)
    .maybeSingle()
  if (!list || list.kind !== "playlist") return { error: "Playlist bulunamadı." }
  if (list.youtube_playlist_id && list.youtube_playlist_id !== ytId) return { error: "Bu kayıt zaten bir playlist'e bağlı." }
  const yt = await getPlaylist(ytId)
  if ("error" in yt) return yt
  if (yt.videos.length === 0) return { error: "Playlist boş görünüyor." }
  const { error: ue } = await db
    .from("student_resource_playlists")
    .update({
      youtube_playlist_id: ytId,
      source: "youtube",
      title: (yt.title ?? "YouTube playlist").slice(0, 200),
      channel_title: yt.channelTitle,
      teacher_name: (yt.channelTitle ?? list.teacher_name).slice(0, 80),
      thumbnail_url: yt.thumbnailUrl,
      last_synced_at: new Date().toISOString(),
      issue: null,
    })
    .eq("id", playlistId)
    .eq("student_id", studentId)
  if (ue?.code === "23505") return { error: "Bu playlist başka bir kartta zaten ekli." }
  if (ue) {
    console.error("linkPlaylistToYoutube", ue)
    return { error: "Kaydedilemedi." }
  }
  const res = await syncYoutubeVideos(db, studentId, playlistId, list.subject_id, yt)
  if ("error" in res) return res
  await writePatches(db, studentId, res.patches)
  return { added: res.added, videos: yt.videos.length }
}
