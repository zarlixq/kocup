"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { isPlaceholderTitle, parseManualVideoList, parseYoutubeLink } from "@/lib/resources/video-match"
import { topicVideosComplete, TEKLI_GROUP_NAME } from "@/lib/resources/videos"
import {
  defaultThumbnail,
  fetchChannelPlaylists,
  fetchDurations,
  fetchOembedTitles,
  fetchVideoMeta,
  getPlaylist,
  youtubeApiEnabled,
  type ChannelPlaylist,
} from "@/lib/resources/youtube"
import { detectDayStructure, PLAN_MODES, type DayStructure } from "@/lib/resources/playlist-plan"
import { applyPlan, extendPlan, shiftPlans, type PlanInput } from "@/lib/resources/playlist-plan-service"
import { istanbulDateStr } from "@/lib/tz"
import { openWatchedPlaylistGoalsSafe, syncPlaylistGoalsSafe } from "@/lib/upplan/roadmap-service"
import { insertVideos, linkPlaylistToYoutube, syncYoutubeVideos, writePatches, type VideoPatch } from "@/lib/resources/video-sync"

type ActionResult<T = undefined> = { success: boolean; error?: string; data?: T }

// Kaynaklarım → video takip. Öğrenci yalnız kendi satırlarını yazar (RLS).
// YouTube çağrıları yalnız burada (sunucu); anahtar istemciye gitmez.
// Öğrenme aşaması (topic_assignments.learned_at) UpPlan/koç hedefinde
// öğrencinin yazma izni olmadığından service role ile, sahiplik doğrulanarak.

const GENERIC_ERROR = "Bir hata oluştu, tekrar deneyin."
const CHANNEL_ERROR = "Kanal linkinden bir playlist seç."
const INVALID_ERROR = "Geçerli bir YouTube playlist, video ya da kanal linki gir."

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
  revalidatePath("/ogrenci")
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
export type PlaylistPreview = {
  kind: "playlist"
  playlistId: string
  title: string | null
  channel: string | null
  thumbnailUrl: string | null
  videoCount: number
  totalSeconds: number | null
  alreadyAdded: boolean
  /** Plan önizlemesi için (başlık + süre, playlist sırasıyla). */
  videos: { title: string; duration_seconds: number | null }[]
  dayStructure: DayStructure
}

export type VideoPreview = {
  kind: "video"
  title: string
  channel: string | null
  thumbnailUrl: string
  durationSeconds: number | null
  alreadyAdded: boolean
}

export type LinkPreview =
  | PlaylistPreview
  | VideoPreview
  /** Playlist içindeki video: öğrenci playlist'in tamamını ya da yalnız videoyu seçer. */
  | { kind: "video_in_playlist"; video: VideoPreview; playlist: PlaylistPreview | null }
  /** Kanal linki: kanalın playlist'leri (öğrenci birini seçer). */
  | { kind: "channel"; channelTitle: string; playlists: (ChannelPlaylist & { alreadyAdded: boolean })[] }
  /** Playlist linki ama API anahtarı yok → elle liste. */
  | { kind: "playlist_manual" }

type Auth = { supabase: Db; userId: string }

async function previewPlaylist(auth: Auth, playlistId: string): Promise<PlaylistPreview | { error: string }> {
  const res = await getPlaylist(playlistId)
  if ("error" in res) return res
  if (res.videos.length === 0) return { error: "Playlist boş görünüyor." }
  const { data: existing } = await auth.supabase
    .from("student_resource_playlists")
    .select("id")
    .eq("student_id", auth.userId)
    .eq("youtube_playlist_id", playlistId)
    .maybeSingle()
  const known = res.videos.every((v) => v.durationSeconds != null)
  return {
    kind: "playlist",
    playlistId,
    title: res.title,
    channel: res.channelTitle,
    thumbnailUrl: res.thumbnailUrl,
    videoCount: res.videos.length,
    totalSeconds: known ? res.videos.reduce((s, v) => s + (v.durationSeconds ?? 0), 0) : null,
    alreadyAdded: !!existing,
    videos: res.videos.map((v) => ({ title: v.title, duration_seconds: v.durationSeconds })),
    dayStructure: detectDayStructure(res.videos.map((v) => v.title)),
  }
}

async function previewVideo(auth: Auth, videoId: string): Promise<VideoPreview | { error: string }> {
  const meta = await fetchVideoMeta(videoId)
  if ("error" in meta) return meta
  const { data: dup } = await auth.supabase
    .from("student_resource_videos")
    .select("id")
    .eq("student_id", auth.userId)
    .eq("youtube_video_id", videoId)
    .limit(1)
  return {
    kind: "video",
    title: meta.title,
    channel: meta.channelTitle,
    thumbnailUrl: meta.thumbnailUrl,
    durationSeconds: meta.durationSeconds,
    alreadyAdded: (dup?.length ?? 0) > 0,
  }
}

export async function previewVideoLink(url: string): Promise<ActionResult<LinkPreview>> {
  try {
    const auth = await requireStudent()
    if (!auth.ok) return { success: false, error: auth.error }
    const link = parseYoutubeLink(String(url ?? "").slice(0, 500))
    if (link.kind === "invalid") return { success: false, error: INVALID_ERROR }

    if (link.kind === "channel") {
      const res = await fetchChannelPlaylists(link.channel)
      if ("error" in res) return { success: false, error: res.error }
      if (res.playlists.length === 0) return { success: false, error: "Bu kanalda herkese açık playlist bulunamadı." }
      const { data: mine } = await auth.supabase
        .from("student_resource_playlists")
        .select("youtube_playlist_id")
        .eq("student_id", auth.userId)
        .not("youtube_playlist_id", "is", null)
      const added = new Set((mine ?? []).map((m) => m.youtube_playlist_id))
      return {
        success: true,
        data: { kind: "channel", channelTitle: res.channelTitle, playlists: res.playlists.map((p) => ({ ...p, alreadyAdded: added.has(p.id) })) },
      }
    }

    if (link.kind === "playlist") {
      if (!youtubeApiEnabled()) return { success: true, data: { kind: "playlist_manual" } }
      const res = await previewPlaylist(auth, link.playlistId)
      return "error" in res ? { success: false, error: res.error } : { success: true, data: res }
    }

    if (link.kind === "video_in_playlist") {
      const [video, playlist] = await Promise.all([
        previewVideo(auth, link.videoId),
        youtubeApiEnabled() ? previewPlaylist(auth, link.playlistId) : Promise.resolve({ error: "anahtar yok" }),
      ])
      if ("error" in video) return { success: false, error: video.error }
      return { success: true, data: { kind: "video_in_playlist", video, playlist: "error" in playlist ? null : playlist } }
    }

    const video = await previewVideo(auth, link.videoId)
    return "error" in video ? { success: false, error: video.error } : { success: true, data: video }
  } catch (e) {
    console.error("previewVideoLink", e)
    return { success: false, error: GENERIC_ERROR }
  }
}

// ── Ekleme ───────────────────────────────────────────────────────────────
const planSchema = z
  .object({
    mode: z.enum(PLAN_MODES as [PlanInput["mode"], ...PlanInput["mode"][]]),
    amount: z.number().int().min(1).max(600).nullable(),
    start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Başlangıç tarihi seç."),
    weekdays: z.array(z.number().int().min(1).max(7)).min(1, "En az bir gün seç.").max(7),
    orderTopics: z.boolean().optional().default(true),
  })
  .refine((p) => p.mode === "gun_yapisi" || p.amount !== null, { message: "Günlük video / dakika miktarını gir." })
  .transform((p) => ({ ...p, weekdays: Array.from(new Set(p.weekdays)).sort((a, b) => a - b) }))

const addSchema = z.object({
  subjectId: z.string().uuid("Ders seç."),
  url: z.string().trim().max(500).optional().default(""),
  title: z.string().trim().max(200).optional().default(""),
  teacherName: z.string().trim().max(80).optional().default(""),
  /** API anahtarı yokken playlist: her satırda bir video linki (+ başlık). */
  manualList: z.string().max(40_000).optional().default(""),
  /** Playlist içindeki video linkinde: tamamı mı, yalnız video mu. */
  only: z.enum(["playlist", "video"]).optional().default("playlist"),
  plan: planSchema.nullable().optional().default(null),
})

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
): Promise<ActionResult<{ kind: "playlist" | "video"; videos: number; matched: number; planEnd?: string | null }>> {
  try {
    const parsed = addSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Form hatalı." }
    const auth = await requireStudent()
    if (!auth.ok) return { success: false, error: auth.error }
    const { subjectId, url, title, teacherName, manualList, only, plan } = parsed.data

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

    const playlistId = link.kind === "playlist" ? link.playlistId : link.kind === "video_in_playlist" && only === "playlist" ? link.playlistId : null
    if (playlistId) {
      const yt = await getPlaylist(playlistId)
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
          channel_title: yt.channelTitle,
          title: name,
          youtube_playlist_id: playlistId,
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
      const planned = plan ? await applyPlan(auth.supabase, auth.userId, list.id, plan) : null
      revalidateVideos()
      if (planned?.error) return { success: false, error: `Playlist eklendi ama ${planned.error.toLocaleLowerCase("tr")}` }
      return { success: true, data: { kind: "playlist", videos: res.inserted, matched: res.matched, planEnd: planned?.end ?? null } }
    }

    // Tekli video.
    const videoId = link.kind === "playlist" ? null : link.videoId
    if (!videoId) return { success: false, error: INVALID_ERROR }
    const { data: dup } = await auth.supabase
      .from("student_resource_videos")
      .select("id")
      .eq("student_id", auth.userId)
      .eq("youtube_video_id", videoId)
      .limit(1)
    if (dup?.length) return { success: false, error: "Bu video zaten ekli." }
    const meta = await fetchVideoMeta(videoId)
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
        videoId: videoId,
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

/// ── Yenile ───────────────────────────────────────────────────────────────
async function loadPlanOf(db: Db, studentId: string, playlistId: string): Promise<PlanInput | null> {
  const { data } = await db
    .from("student_resource_playlists")
    .select("plan_mode, plan_amount, plan_start, plan_weekdays")
    .eq("id", playlistId)
    .eq("student_id", studentId)
    .maybeSingle()
  const mode = PLAN_MODES.find((m) => m === data?.plan_mode)
  if (!data || !mode || !data.plan_start) return null
  return { mode, amount: data.plan_amount, start: data.plan_start, weekdays: data.plan_weekdays?.length ? data.plan_weekdays : [1, 2, 3, 4, 5, 6, 7] }
}

/**
 * YouTube'dan taze çeker (önbelleği yeniler); planlı playlist'te yeni
 * videolar aynı tempoyla planın sonuna eklenir. Anahtarsız / elle listede
 * başlık ve süre onarımı.
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

    let added = 0
    let patches = new Map<string, VideoPatch>()
    if (list.youtube_playlist_id && youtubeApiEnabled()) {
      const yt = await getPlaylist(list.youtube_playlist_id, { force: true })
      if ("error" in yt) return { success: false, error: yt.error }
      const res = await syncYoutubeVideos(auth.supabase, auth.userId, playlistId, list.subject_id, yt)
      if ("error" in res) return { success: false, error: res.error }
      added = res.added
      patches = res.patches
      await auth.supabase
        .from("student_resource_playlists")
        .update({ last_synced_at: new Date().toISOString(), thumbnail_url: yt.thumbnailUrl, channel_title: yt.channelTitle })
        .eq("id", playlistId)
        .eq("student_id", auth.userId)
    } else {
      // Anahtarsız / elle liste: başlık ve (anahtar varsa) süre onarımı.
      const { data: current } = await auth.supabase
        .from("student_resource_videos")
        .select("id, youtube_video_id, title, duration_seconds, thumbnail_url")
        .eq("playlist_id", playlistId)
      const existing = current ?? []
      const placeholders = existing.filter((v) => isPlaceholderTitle(v.title)).map((v) => v.youtube_video_id)
      const noDuration = existing.filter((v) => v.duration_seconds == null).map((v) => v.youtube_video_id)
      const [titles, durations] = await Promise.all([fetchOembedTitles(placeholders.slice(0, 150)), fetchDurations(noDuration)])
      for (const v of existing) {
        const p: VideoPatch = {}
        const t = titles.get(v.youtube_video_id)
        if (t) p.title = t
        const d = durations.get(v.youtube_video_id)
        if (d != null) p.duration_seconds = d
        if (!v.thumbnail_url) p.thumbnail_url = defaultThumbnail(v.youtube_video_id)
        if (Object.keys(p).length) patches.set(v.id, p)
      }
    }
    await writePatches(auth.supabase, auth.userId, patches)
    const plan = added > 0 ? await loadPlanOf(auth.supabase, auth.userId, playlistId) : null
    if (plan) await extendPlan(auth.supabase, auth.userId, playlistId, plan)
    revalidateVideos()
    return { success: true, data: { added, updated: patches.size } }
  } catch (e) {
    console.error("refreshPlaylist", e)
    return { success: false, error: GENERIC_ERROR }
  }
}

// ── Düzelt (kanal linkiyle eklenmiş eksik kayıt) ─────────────────────────
const fixSchema = z.object({ url: z.string().trim().min(1).max(500), plan: planSchema.nullable().optional().default(null) })

/**
 * Eksik kaydı seçilen YouTube playlist'ine bağlar: başlık, kanal, kapak ve
 * videolar gelir; mevcut videolar ve izleme işaretleri korunur (silinmez).
 */
export async function fixPlaylistSource(playlistId: string, input: unknown): Promise<ActionResult<{ added: number }>> {
  try {
    if (!z.string().uuid().safeParse(playlistId).success) return { success: false, error: "Geçersiz playlist." }
    const parsed = fixSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Form hatalı." }
    const auth = await requireStudent()
    if (!auth.ok) return { success: false, error: auth.error }
    const link = parseYoutubeLink(parsed.data.url)
    const ytId = link.kind === "playlist" || link.kind === "video_in_playlist" ? link.playlistId : null
    if (!ytId) return { success: false, error: "Bir YouTube playlist'i seç." }
    const res = await linkPlaylistToYoutube(auth.supabase, auth.userId, playlistId, ytId)
    if ("error" in res) return { success: false, error: res.error }
    if (parsed.data.plan) await applyPlan(auth.supabase, auth.userId, playlistId, parsed.data.plan)
    revalidateVideos()
    return { success: true, data: { added: res.added } }
  } catch (e) {
    console.error("fixPlaylistSource", e)
    return { success: false, error: GENERIC_ERROR }
  }
}

// ── Çalışma planı ────────────────────────────────────────────────────────
/** Planı kur / değiştir (plan=null → kaldır). */
export async function setPlaylistPlan(playlistId: string, plan: unknown): Promise<ActionResult<{ days: number; end: string | null }>> {
  try {
    if (!z.string().uuid().safeParse(playlistId).success) return { success: false, error: "Geçersiz playlist." }
    const parsed = planSchema.nullable().safeParse(plan)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Plan hatalı." }
    const auth = await requireStudent()
    if (!auth.ok) return { success: false, error: auth.error }
    const res = await applyPlan(auth.supabase, auth.userId, playlistId, parsed.data)
    if (res.error) return { success: false, error: res.error }
    // Yol haritasındaki playlist konularının tarihleri yeni takvime çekilir.
    await syncPlaylistGoalsSafe(supabaseAdmin(), auth.userId)
    revalidateVideos()
    return { success: true, data: { days: res.days, end: res.end } }
  } catch (e) {
    console.error("setPlaylistPlan", e)
    return { success: false, error: GENERIC_ERROR }
  }
}

/** Kaydır: izlenmemiş plan günleri bugünden itibaren yeniden tarihlenir (playlistId yoksa tüm aktif planlar). */
export async function shiftVideoPlan(playlistId?: string): Promise<ActionResult<{ moved: number }>> {
  try {
    if (playlistId !== undefined && !z.string().uuid().safeParse(playlistId).success) return { success: false, error: "Geçersiz playlist." }
    const auth = await requireStudent()
    if (!auth.ok) return { success: false, error: auth.error }
    const res = await shiftPlans(auth.supabase, auth.userId, istanbulDateStr(), playlistId)
    if (res.error) return { success: false, error: res.error }
    // Kaydırma yol haritasındaki playlist konularının tarihlerini de kaydırır.
    if (res.moved > 0) await syncPlaylistGoalsSafe(supabaseAdmin(), auth.userId)
    await rememberCheckin(auth.supabase, auth.userId)
    revalidateVideos()
    return { success: true, data: { moved: res.moved } }
  } catch (e) {
    console.error("shiftVideoPlan", e)
    return { success: false, error: GENERIC_ERROR }
  }
}

/** Gecikenler → "İzledim": birden çok videoyu izlendi işaretler. */
export async function markVideosWatched(videoIds: string[]): Promise<ActionResult<{ count: number }>> {
  try {
    const parsed = z.array(z.string().uuid()).min(1).max(100).safeParse(videoIds)
    if (!parsed.success) return { success: false, error: "Geçersiz video." }
    const auth = await requireStudent()
    if (!auth.ok) return { success: false, error: auth.error }
    const { data, error } = await auth.supabase
      .from("student_resource_videos")
      .update({ watch_status: "izlendi", watched_at: new Date().toISOString() })
      .in("id", parsed.data)
      .eq("student_id", auth.userId)
      .eq("watch_status", "izlenmedi")
      .select("topic_id")
    if (error) return { success: false, error: "Kaydedilemedi." }
    const topics = Array.from(new Set((data ?? []).map((d) => d.topic_id).filter((t): t is string => !!t)))
    for (const t of topics) await syncLearnedFromVideos(auth.userId, t)
    if (topics.length) await openWatchedPlaylistGoalsSafe(supabaseAdmin(), auth.userId)
    await rememberCheckin(auth.supabase, auth.userId)
    revalidateVideos()
    return { success: true, data: { count: data?.length ?? 0 } }
  } catch (e) {
    console.error("markVideosWatched", e)
    return { success: false, error: GENERIC_ERROR }
  }
}

// "Dünün videolarını izledin mi?" günde bir kez sorulur: cevap tarihi DB'de
// (user_ui_preferences, scope video_checkin) — localStorage değil.
async function rememberCheckin(db: Db, userId: string) {
  const { error } = await db
    .from("user_ui_preferences")
    .upsert({ user_id: userId, scope: "video_checkin", settings: { date: istanbulDateStr() } }, { onConflict: "user_id,scope" })
  if (error) console.error("rememberCheckin", error)
}

/** Soruyu bugün için kapat ("Sonra"). */
export async function dismissVideoCheckin(): Promise<ActionResult> {
  const auth = await requireStudent()
  if (!auth.ok) return { success: false, error: auth.error }
  await rememberCheckin(auth.supabase, auth.userId)
  return { success: true }
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
  // Playlist konusu planından önce izlendiyse yol haritasında açılır.
  if (cur.topic_id && patch.watch_status === "izlendi" && cur.watch_status !== "izlendi") await openWatchedPlaylistGoalsSafe(supabaseAdmin(), auth.userId)
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
