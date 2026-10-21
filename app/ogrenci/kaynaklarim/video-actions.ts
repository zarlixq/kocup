"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { fetchActiveTopics } from "@/lib/curriculum/active-topics"
import { isPlaceholderTitle, matchVideoTopic, parseManualVideoList, parseYoutubeLink } from "@/lib/resources/video-match"
import { topicVideosComplete, TEKLI_GROUP_NAME } from "@/lib/resources/videos"
import {
  defaultThumbnail,
  fetchDurations,
  fetchOembedTitles,
  fetchVideoMeta,
  fetchYoutubePlaylist,
  youtubeApiEnabled,
} from "@/lib/resources/youtube"

type ActionResult<T = undefined> = { success: boolean; error?: string; data?: T }

// Kaynaklarım → video takip. Öğrenci yalnız kendi satırlarını yazar (RLS).
// YouTube çağrıları yalnız burada (sunucu); anahtar istemciye gitmez.
// Öğrenme aşaması (topic_assignments.learned_at) UpPlan/koç hedefinde
// öğrencinin yazma izni olmadığından service role ile, sahiplik doğrulanarak.

const GENERIC_ERROR = "Bir hata oluştu, tekrar deneyin."
const CHANNEL_ERROR = "Kanal linki eklenemez, playlist veya video linki gir."
const INVALID_ERROR = "Geçerli bir YouTube playlist veya video linki gir."

async function requireStudent() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: "Oturum bulunamadı." }
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
  if (profile?.role !== "student") return { ok: false as const, error: "Yetkisiz işlem." }
  return { ok: true as const, supabase, userId: user.id }
}

type Db = Awaited<ReturnType<typeof createClient>>

function revalidateVideos() {
  revalidatePath("/ogrenci/kaynaklarim")
  revalidatePath("/ogrenci/konularim")
  revalidatePath("/ogrenci/program")
  revalidatePath("/ogrenci/analizim")
}

/** Konunun tüm videoları izlendi (anlamadım yok) → açık öğrenme aşamalı hedeflerde learned_at. */
async function syncLearnedFromVideos(studentId: string, topicId: string): Promise<boolean> {
  const db = await createClient()
  if (!(await topicVideosComplete(db, studentId, topicId))) return false
  const { data, error } = await supabaseAdmin()
    .from("topic_assignments")
    .update({ learned_at: new Date().toISOString() })
    .eq("student_id", studentId)
    .eq("topic_id", topicId)
    .in("status", ["aktif", "sirada"])
    .in("learning_phase", ["gerekli", "opsiyonel"])
    .is("learned_at", null)
    .select("id")
  if (error) console.error("syncLearnedFromVideos", error)
  return !error && (data?.length ?? 0) > 0
}

// ── Önizleme ─────────────────────────────────────────────────────────────
export type LinkPreview =
  | {
      kind: "playlist"
      title: string | null
      channel: string | null
      thumbnailUrl: string | null
      videoCount: number
      totalSeconds: number | null
      alreadyAdded: boolean
    }
  | {
      kind: "video"
      title: string
      channel: string | null
      thumbnailUrl: string
      durationSeconds: number | null
      alreadyAdded: boolean
    }
  /** Playlist linki ama API anahtarı yok → elle liste. */
  | { kind: "playlist_manual" }

export async function previewVideoLink(url: string): Promise<ActionResult<LinkPreview>> {
  try {
    const auth = await requireStudent()
    if (!auth.ok) return { success: false, error: auth.error }
    const link = parseYoutubeLink(String(url ?? "").slice(0, 500))
    if (link.kind === "channel") return { success: false, error: CHANNEL_ERROR }
    if (link.kind === "invalid") return { success: false, error: INVALID_ERROR }

    if (link.kind === "playlist") {
      if (!youtubeApiEnabled()) return { success: true, data: { kind: "playlist_manual" } }
      const res = await fetchYoutubePlaylist(link.playlistId)
      if ("error" in res) return { success: false, error: res.error }
      if (res.videos.length === 0) return { success: false, error: "Playlist boş görünüyor." }
      const { data: existing } = await auth.supabase
        .from("student_resource_playlists")
        .select("id")
        .eq("student_id", auth.userId)
        .eq("youtube_playlist_id", link.playlistId)
        .maybeSingle()
      const known = res.videos.every((v) => v.durationSeconds != null)
      return {
        success: true,
        data: {
          kind: "playlist",
          title: res.title,
          channel: res.channelTitle,
          thumbnailUrl: res.thumbnailUrl,
          videoCount: res.videos.length,
          totalSeconds: known ? res.videos.reduce((s, v) => s + (v.durationSeconds ?? 0), 0) : null,
          alreadyAdded: !!existing,
        },
      }
    }

    const meta = await fetchVideoMeta(link.videoId)
    if ("error" in meta) return { success: false, error: meta.error }
    const { data: dup } = await auth.supabase
      .from("student_resource_videos")
      .select("id")
      .eq("student_id", auth.userId)
      .eq("youtube_video_id", link.videoId)
      .limit(1)
    return {
      success: true,
      data: {
        kind: "video",
        title: meta.title,
        channel: meta.channelTitle,
        thumbnailUrl: meta.thumbnailUrl,
        durationSeconds: meta.durationSeconds,
        alreadyAdded: (dup?.length ?? 0) > 0,
      },
    }
  } catch (e) {
    console.error("previewVideoLink", e)
    return { success: false, error: GENERIC_ERROR }
  }
}

// ── Ekleme ───────────────────────────────────────────────────────────────
const addSchema = z.object({
  subjectId: z.string().uuid("Ders seç."),
  url: z.string().trim().max(500).optional().default(""),
  title: z.string().trim().max(200).optional().default(""),
  teacherName: z.string().trim().max(80).optional().default(""),
  /** API anahtarı yokken playlist: her satırda bir video linki (+ başlık). */
  manualList: z.string().max(40_000).optional().default(""),
})

type NewVideo = { videoId: string; title: string; position: number; durationSeconds: number | null; thumbnailUrl: string }

async function insertVideos(
  db: Db,
  studentId: string,
  playlistId: string,
  subjectId: string,
  videos: NewVideo[],
): Promise<{ inserted: number; matched: number } | { error: string }> {
  if (videos.length === 0) return { inserted: 0, matched: 0 }
  const topics = await fetchActiveTopics(db, { subjectId })
  let matched = 0
  const rows = videos.map((v) => {
    const m = matchVideoTopic(v.title, topics)
    if (m) matched += 1
    return {
      student_id: studentId,
      playlist_id: playlistId,
      youtube_video_id: v.videoId,
      title: v.title,
      position: v.position,
      duration_seconds: v.durationSeconds,
      thumbnail_url: v.thumbnailUrl,
      topic_id: m?.topic_id ?? null,
      match_status: m ? "oneri" : "eslesmedi",
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
  return { inserted: data?.length ?? 0, matched }
}

/** Dersin "Tekli videolar" grubu (yoksa oluşturur). */
async function ensureTekliGroup(db: Db, studentId: string, subjectId: string): Promise<string | null> {
  const find = () =>
    db
      .from("student_resource_playlists")
      .select("id")
      .eq("student_id", studentId)
      .eq("subject_id", subjectId)
      .eq("kind", "tekli")
      .maybeSingle()
  const { data: found } = await find()
  if (found) return found.id
  const { data, error } = await db
    .from("student_resource_playlists")
    .insert({ student_id: studentId, subject_id: subjectId, kind: "tekli", teacher_name: TEKLI_GROUP_NAME, source: "manuel" })
    .select("id")
    .single()
  if (data) return data.id
  // Eşzamanlı ekleme: benzersiz indeks çakıştıysa mevcut satırı al.
  if (error?.code === "23505") return (await find()).data?.id ?? null
  console.error("ensureTekliGroup", error)
  return null
}

export async function addVideoSource(
  input: unknown,
): Promise<ActionResult<{ kind: "playlist" | "video"; videos: number; matched: number }>> {
  try {
    const parsed = addSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Form hatalı." }
    const auth = await requireStudent()
    if (!auth.ok) return { success: false, error: auth.error }
    const { subjectId, url, title, teacherName, manualList } = parsed.data

    // Elle liste (anahtarsız playlist).
    if (manualList.trim()) {
      const listed = parseManualVideoList(manualList)
      if (listed.length === 0) return { success: false, error: "Listede YouTube video linki bulunamadı." }
      if (!title) return { success: false, error: "Playlist adını yaz." }
      const missing = listed.filter((v) => isPlaceholderTitle(v.title)).map((v) => v.videoId)
      const [titles, durations] = await Promise.all([fetchOembedTitles(missing.slice(0, 150)), fetchDurations(listed.map((v) => v.videoId))])
      const { data: list, error: le } = await auth.supabase
        .from("student_resource_playlists")
        .insert({ student_id: auth.userId, subject_id: subjectId, teacher_name: teacherName || title.slice(0, 80), title, source: "manuel", kind: "playlist" })
        .select("id")
        .single()
      if (le || !list) {
        console.error("addVideoSource manual", le)
        return { success: false, error: "Playlist kaydedilemedi." }
      }
      const res = await insertVideos(
        auth.supabase,
        auth.userId,
        list.id,
        subjectId,
        listed.map((v) => ({
          videoId: v.videoId,
          title: titles.get(v.videoId) ?? v.title,
          position: v.position,
          durationSeconds: durations.get(v.videoId) ?? null,
          thumbnailUrl: defaultThumbnail(v.videoId),
        })),
      )
      if ("error" in res) return { success: false, error: res.error }
      revalidateVideos()
      return { success: true, data: { kind: "playlist", videos: res.inserted, matched: res.matched } }
    }

    const link = parseYoutubeLink(url)
    if (link.kind === "channel") return { success: false, error: CHANNEL_ERROR }
    if (link.kind === "invalid") return { success: false, error: INVALID_ERROR }

    if (link.kind === "playlist") {
      const yt = await fetchYoutubePlaylist(link.playlistId)
      if ("error" in yt) return { success: false, error: yt.error }
      if (yt.videos.length === 0) return { success: false, error: "Playlist boş görünüyor." }
      const name = (title || yt.title || "YouTube playlist").slice(0, 200)
      const { data: list, error: le } = await auth.supabase
        .from("student_resource_playlists")
        .insert({
          student_id: auth.userId,
          subject_id: subjectId,
          kind: "playlist",
          teacher_name: (teacherName || yt.channelTitle || name).slice(0, 80),
          title: name,
          youtube_playlist_id: link.playlistId,
          source: "youtube",
          thumbnail_url: yt.thumbnailUrl,
          last_synced_at: new Date().toISOString(),
        })
        .select("id")
        .single()
      if (le?.code === "23505") return { success: false, error: "Bu playlist zaten ekli. Yeni videolar için kartındaki Yenile'yi kullan." }
      if (le || !list) {
        console.error("addVideoSource playlist", le)
        return { success: false, error: "Playlist kaydedilemedi." }
      }
      const res = await insertVideos(auth.supabase, auth.userId, list.id, subjectId, yt.videos)
      if ("error" in res) return { success: false, error: res.error }
      revalidateVideos()
      return { success: true, data: { kind: "playlist", videos: res.inserted, matched: res.matched } }
    }

    // Tekli video.
    const { data: dup } = await auth.supabase
      .from("student_resource_videos")
      .select("id")
      .eq("student_id", auth.userId)
      .eq("youtube_video_id", link.videoId)
      .limit(1)
    if (dup?.length) return { success: false, error: "Bu video zaten ekli." }
    const meta = await fetchVideoMeta(link.videoId)
    if ("error" in meta) return { success: false, error: meta.error }
    const groupId = await ensureTekliGroup(auth.supabase, auth.userId, subjectId)
    if (!groupId) return { success: false, error: "Video kaydedilemedi." }
    const { data: last } = await auth.supabase
      .from("student_resource_videos")
      .select("position")
      .eq("playlist_id", groupId)
      .order("position", { ascending: false })
      .limit(1)
    const res = await insertVideos(auth.supabase, auth.userId, groupId, subjectId, [
      {
        videoId: link.videoId,
        title: (title || meta.title).slice(0, 200),
        position: (last?.[0]?.position ?? -1) + 1,
        durationSeconds: meta.durationSeconds,
        thumbnailUrl: meta.thumbnailUrl,
      },
    ])
    if ("error" in res) return { success: false, error: res.error }
    revalidateVideos()
    return { success: true, data: { kind: "video", videos: res.inserted, matched: res.matched } }
  } catch (e) {
    console.error("addVideoSource", e)
    return { success: false, error: GENERIC_ERROR }
  }
}

// ── Yenile ───────────────────────────────────────────────────────────────
/**
 * YouTube playlist'inden yeni videoları ekler, eksik süre/küçük resimleri
 * tamamlar; "Video N" başlıklarını oEmbed ile düzeltir. İzleme işaretlerine dokunmaz.
 */
export async function refreshPlaylist(playlistId: string): Promise<ActionResult<{ added: number; updated: number }>> {
  try {
    if (!z.string().uuid().safeParse(playlistId).success) return { success: false, error: "Geçersiz playlist." }
    const auth = await requireStudent()
    if (!auth.ok) return { success: false, error: auth.error }
    const { data: list } = await auth.supabase
      .from("student_resource_playlists")
      .select("id, subject_id, youtube_playlist_id")
      .eq("id", playlistId)
      .eq("student_id", auth.userId)
      .maybeSingle()
    if (!list) return { success: false, error: "Playlist bulunamadı." }
    const { data: current } = await auth.supabase
      .from("student_resource_videos")
      .select("id, youtube_video_id, title, duration_seconds, thumbnail_url, position")
      .eq("playlist_id", playlistId)
    const existing = current ?? []
    const byVideo = new Map(existing.map((v) => [v.youtube_video_id, v]))

    let added = 0
    const patches = new Map<string, { title?: string; duration_seconds?: number; thumbnail_url?: string; position?: number }>()
    if (list.youtube_playlist_id && youtubeApiEnabled()) {
      const yt = await fetchYoutubePlaylist(list.youtube_playlist_id)
      if ("error" in yt) return { success: false, error: yt.error }
      const fresh = yt.videos.filter((v) => !byVideo.has(v.videoId))
      const res = await insertVideos(auth.supabase, auth.userId, playlistId, list.subject_id, fresh)
      if ("error" in res) return { success: false, error: res.error }
      added = res.inserted
      for (const v of yt.videos) {
        const cur = byVideo.get(v.videoId)
        if (!cur) continue
        const p: { title?: string; duration_seconds?: number; thumbnail_url?: string; position?: number } = {}
        if (cur.duration_seconds == null && v.durationSeconds != null) p.duration_seconds = v.durationSeconds
        if (!cur.thumbnail_url) p.thumbnail_url = v.thumbnailUrl
        if (isPlaceholderTitle(cur.title)) p.title = v.title
        if (cur.position !== v.position) p.position = v.position
        if (Object.keys(p).length) patches.set(cur.id, p)
      }
      await auth.supabase
        .from("student_resource_playlists")
        .update({ last_synced_at: new Date().toISOString(), thumbnail_url: yt.thumbnailUrl })
        .eq("id", playlistId)
        .eq("student_id", auth.userId)
    } else {
      // Anahtarsız / elle liste: başlık ve (anahtar varsa) süre onarımı.
      const placeholders = existing.filter((v) => isPlaceholderTitle(v.title)).map((v) => v.youtube_video_id)
      const noDuration = existing.filter((v) => v.duration_seconds == null).map((v) => v.youtube_video_id)
      const [titles, durations] = await Promise.all([fetchOembedTitles(placeholders.slice(0, 150)), fetchDurations(noDuration)])
      for (const v of existing) {
        const p: { title?: string; duration_seconds?: number; thumbnail_url?: string } = {}
        const t = titles.get(v.youtube_video_id)
        if (t) p.title = t
        const d = durations.get(v.youtube_video_id)
        if (d != null) p.duration_seconds = d
        if (!v.thumbnail_url) p.thumbnail_url = defaultThumbnail(v.youtube_video_id)
        if (Object.keys(p).length) patches.set(v.id, p)
      }
    }

    // Satır bazlı güncelleme (aynı playlist, en fazla birkaç yüz).
    const results = await Promise.all(
      Array.from(patches, ([id, p]) => auth.supabase.from("student_resource_videos").update(p).eq("id", id).eq("student_id", auth.userId)),
    )
    const failed = results.find((r) => r.error)
    if (failed?.error) console.error("refreshPlaylist update", failed.error)
    revalidateVideos()
    return { success: true, data: { added, updated: patches.size } }
  } catch (e) {
    console.error("refreshPlaylist", e)
    return { success: false, error: GENERIC_ERROR }
  }
}

// ── Playlist düzenleme ───────────────────────────────────────────────────
const playlistPatchSchema = z.object({
  title: z.string().trim().min(1, "Ad boş olamaz.").max(200).optional(),
  status: z.enum(["aktif", "duraklatildi", "tamamlandi"]).optional(),
})

export async function updatePlaylist(playlistId: string, input: unknown): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(playlistId).success) return { success: false, error: "Geçersiz playlist." }
  const parsed = playlistPatchSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Form hatalı." }
  const auth = await requireStudent()
  if (!auth.ok) return { success: false, error: auth.error }
  const { data, error } = await auth.supabase
    .from("student_resource_playlists")
    .update(parsed.data)
    .eq("id", playlistId)
    .eq("student_id", auth.userId)
    .select("id")
  if (error || !data?.length) return { success: false, error: "Kaydedilemedi." }
  revalidateVideos()
  return { success: true }
}

/** Videonun konusunu onayla / değiştir (null → eşleşme yok). */
export async function setVideoTopic(videoId: string, topicId: string | null): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(videoId).success) return { success: false, error: "Geçersiz video." }
  if (topicId !== null && !z.string().uuid().safeParse(topicId).success) return { success: false, error: "Geçersiz konu." }
  const auth = await requireStudent()
  if (!auth.ok) return { success: false, error: auth.error }
  const { data, error } = await auth.supabase
    .from("student_resource_videos")
    .update({ topic_id: topicId, match_status: topicId ? "onaylandi" : "eslesmedi" })
    .eq("id", videoId)
    .eq("student_id", auth.userId)
    .select("id")
  if (error || !data?.length) return { success: false, error: "Eşleşme kaydedilemedi." }
  if (topicId) await syncLearnedFromVideos(auth.userId, topicId)
  revalidateVideos()
  return { success: true }
}

/** Playlist'teki tüm otomatik eşleşme önerilerini onayla. */
export async function confirmPlaylistSuggestions(playlistId: string): Promise<ActionResult<{ count: number }>> {
  if (!z.string().uuid().safeParse(playlistId).success) return { success: false, error: "Geçersiz playlist." }
  const auth = await requireStudent()
  if (!auth.ok) return { success: false, error: auth.error }
  const { data, error } = await auth.supabase
    .from("student_resource_videos")
    .update({ match_status: "onaylandi" })
    .eq("playlist_id", playlistId)
    .eq("student_id", auth.userId)
    .eq("match_status", "oneri")
    .select("id")
  if (error) return { success: false, error: "Onaylanamadı." }
  revalidateVideos()
  return { success: true, data: { count: data?.length ?? 0 } }
}

const markSchema = z.object({
  watched: z.boolean().optional(),
  understanding: z.enum(["anladim", "kismen", "anlamadim"]).nullable().optional(),
})

/** İzledim / anlama işareti. Konunun tüm videoları bitince öğrenme aşaması tamamlanır. */
export async function markVideo(videoId: string, input: unknown): Promise<ActionResult<{ learned: boolean }>> {
  if (!z.string().uuid().safeParse(videoId).success) return { success: false, error: "Geçersiz video." }
  const parsed = markSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: "Geçersiz işaret." }
  const auth = await requireStudent()
  if (!auth.ok) return { success: false, error: auth.error }
  const { data: cur } = await auth.supabase
    .from("student_resource_videos")
    .select("watch_status, topic_id")
    .eq("id", videoId)
    .eq("student_id", auth.userId)
    .maybeSingle()
  if (!cur) return { success: false, error: "Video bulunamadı." }

  const { watched, understanding } = parsed.data
  const patch: { watch_status?: string; watched_at?: string | null; understanding?: string | null } = {}
  if (watched !== undefined) {
    patch.watch_status = watched ? "izlendi" : "izlenmedi"
    // Zaten izlenmiş videoda tarih korunur; geri alınca silinir.
    if (!watched) patch.watched_at = null
    else if (cur.watch_status !== "izlendi") patch.watched_at = new Date().toISOString()
    if (!watched) patch.understanding = null
  }
  if (understanding !== undefined) {
    patch.understanding = understanding
    // Anlama işareti izlenmiş sayılır.
    if (understanding && watched === undefined && cur.watch_status !== "izlendi") {
      patch.watch_status = "izlendi"
      patch.watched_at = new Date().toISOString()
    }
  }
  const { error } = await auth.supabase.from("student_resource_videos").update(patch).eq("id", videoId).eq("student_id", auth.userId)
  if (error) return { success: false, error: "Kaydedilemedi." }
  const learned = cur.topic_id ? await syncLearnedFromVideos(auth.userId, cur.topic_id) : false
  revalidateVideos()
  return { success: true, data: { learned } }
}

export async function setVideoNote(videoId: string, note: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(videoId).success) return { success: false, error: "Geçersiz video." }
  const parsed = z.string().trim().max(500, "Not en fazla 500 karakter.").safeParse(note ?? "")
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message }
  const auth = await requireStudent()
  if (!auth.ok) return { success: false, error: auth.error }
  const { data, error } = await auth.supabase
    .from("student_resource_videos")
    .update({ note: parsed.data || null })
    .eq("id", videoId)
    .eq("student_id", auth.userId)
    .select("id")
  if (error || !data?.length) return { success: false, error: "Not kaydedilemedi." }
  revalidatePath("/ogrenci/kaynaklarim")
  return { success: true }
}

export async function deleteVideo(videoId: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(videoId).success) return { success: false, error: "Geçersiz video." }
  const auth = await requireStudent()
  if (!auth.ok) return { success: false, error: auth.error }
  const { data, error } = await auth.supabase
    .from("student_resource_videos")
    .delete()
    .eq("id", videoId)
    .eq("student_id", auth.userId)
    .select("id")
  if (error || !data?.length) return { success: false, error: "Silinemedi." }
  revalidateVideos()
  return { success: true }
}

/** "Konuyu öğrendim": öğrenme aşamasını elle bitirir (soru aşaması başlar). */
export async function markTopicLearned(assignmentId: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(assignmentId).success) return { success: false, error: "Geçersiz hedef." }
  const auth = await requireStudent()
  if (!auth.ok) return { success: false, error: auth.error }
  // Sahiplik oturum client'ıyla (RLS: öğrenci kendi hedeflerini görür).
  const { data: own } = await auth.supabase
    .from("topic_assignments")
    .select("id")
    .eq("id", assignmentId)
    .eq("student_id", auth.userId)
    .maybeSingle()
  if (!own) return { success: false, error: "Hedef bulunamadı." }
  const { error } = await supabaseAdmin()
    .from("topic_assignments")
    .update({ learned_at: new Date().toISOString() })
    .eq("id", assignmentId)
    .eq("student_id", auth.userId)
    .is("learned_at", null)
  if (error) {
    console.error("markTopicLearned", error)
    return { success: false, error: "Kaydedilemedi." }
  }
  revalidateVideos()
  return { success: true }
}

export async function deletePlaylist(playlistId: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(playlistId).success) return { success: false, error: "Geçersiz playlist." }
  const auth = await requireStudent()
  if (!auth.ok) return { success: false, error: auth.error }
  const { data, error } = await auth.supabase
    .from("student_resource_playlists")
    .delete()
    .eq("id", playlistId)
    .eq("student_id", auth.userId)
    .select("id")
  if (error || !data?.length) return { success: false, error: "Silinemedi." }
  revalidateVideos()
  return { success: true }
}
