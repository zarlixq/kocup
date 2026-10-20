"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { fetchActiveTopics } from "@/lib/curriculum/active-topics"
import { matchVideoTopic, parseManualVideoList, parseYoutubePlaylistId } from "@/lib/resources/video-match"
import { fetchYoutubePlaylist, topicVideosComplete } from "@/lib/resources/videos"

type ActionResult<T = undefined> = { success: boolean; error?: string; data?: T }

// Kaynaklarım → video playlist'leri. Öğrenci yalnız kendi satırlarını yazar
// (RLS). Öğrenme aşaması (topic_assignments.learned_at) UpPlan/koç hedefinde
// öğrencinin yazma izni olmadığından service role ile, sahiplik doğrulanarak.

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

function revalidateVideos() {
  revalidatePath("/ogrenci/kaynaklarim")
  revalidatePath("/ogrenci/konularim")
  revalidatePath("/ogrenci/program")
}

/** Konunun tüm videoları "izlendi + anladım/kısmen" → açık öğrenme aşamalı hedeflerde learned_at. */
async function syncLearnedFromVideos(studentId: string, topicId: string): Promise<boolean> {
  const db = await createClient()
  if (!(await topicVideosComplete(db, studentId, topicId))) return false
  const { error } = await supabaseAdmin()
    .from("topic_assignments")
    .update({ learned_at: new Date().toISOString() })
    .eq("student_id", studentId)
    .eq("topic_id", topicId)
    .in("status", ["aktif", "sirada"])
    .in("learning_phase", ["gerekli", "opsiyonel"])
    .is("learned_at", null)
  if (error) console.error("syncLearnedFromVideos", error)
  return !error
}

const addSchema = z.object({
  subjectId: z.string().uuid("Ders seç."),
  teacherName: z.string().trim().min(1, "Hoca / kanal adını yaz.").max(80),
  url: z.string().trim().max(500).optional().default(""),
  manualList: z.string().max(40_000).optional().default(""),
})

export async function addPlaylist(input: unknown): Promise<ActionResult<{ videos: number; matched: number }>> {
  try {
    const parsed = addSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Form hatalı." }
    const auth = await requireStudent()
    if (!auth.ok) return { success: false, error: auth.error }
    const { subjectId, teacherName, url, manualList } = parsed.data

    let title: string | null = null
    let playlistId: string | null = null
    let videos: { videoId: string; title: string; position: number }[]
    if (manualList.trim()) {
      videos = parseManualVideoList(manualList)
      if (videos.length === 0) return { success: false, error: "Listede YouTube video linki bulunamadı." }
    } else {
      playlistId = parseYoutubePlaylistId(url)
      if (!playlistId) return { success: false, error: "Geçerli bir YouTube playlist linki gir ya da videoları elle listele." }
      const res = await fetchYoutubePlaylist(playlistId)
      if ("error" in res) return { success: false, error: res.error }
      title = res.title
      videos = res.videos
      if (videos.length === 0) return { success: false, error: "Playlist boş görünüyor." }
    }

    const topics = await fetchActiveTopics(auth.supabase, { subjectId })
    const { data: list, error: le } = await auth.supabase
      .from("student_resource_playlists")
      .insert({
        student_id: auth.userId,
        subject_id: subjectId,
        teacher_name: teacherName,
        title,
        youtube_playlist_id: playlistId,
        source: manualList.trim() ? "manuel" : "youtube",
      })
      .select("id")
      .single()
    if (le || !list) {
      console.error("addPlaylist", le)
      return { success: false, error: "Playlist kaydedilemedi." }
    }

    let matched = 0
    const rows = videos.map((v) => {
      const m = matchVideoTopic(v.title, topics)
      if (m) matched += 1
      return {
        student_id: auth.userId,
        playlist_id: list.id,
        youtube_video_id: v.videoId,
        title: v.title,
        position: v.position,
        topic_id: m?.topic_id ?? null,
        match_status: m ? "oneri" : "eslesmedi",
        match_score: m?.score ?? null,
      }
    })
    const { error: ve } = await auth.supabase.from("student_resource_videos").upsert(rows, { onConflict: "playlist_id,youtube_video_id", ignoreDuplicates: true })
    if (ve) {
      console.error("addPlaylist videos", ve)
      return { success: false, error: "Videolar kaydedilemedi." }
    }
    revalidateVideos()
    return { success: true, data: { videos: rows.length, matched } }
  } catch (e) {
    console.error("addPlaylist", e)
    return { success: false, error: "Bir hata oluştu, tekrar deneyin." }
  }
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
  const patch: { watch_status?: string; watched_at?: string | null; understanding?: string | null } = {}
  if (parsed.data.watched !== undefined) {
    patch.watch_status = parsed.data.watched ? "izlendi" : "izlenmedi"
    patch.watched_at = parsed.data.watched ? new Date().toISOString() : null
    if (!parsed.data.watched) patch.understanding = null
  }
  if (parsed.data.understanding !== undefined) {
    patch.understanding = parsed.data.understanding
    // Anlama işareti izlenmiş sayılır.
    if (parsed.data.understanding && parsed.data.watched === undefined) {
      patch.watch_status = "izlendi"
      patch.watched_at = new Date().toISOString()
    }
  }
  const { data, error } = await auth.supabase
    .from("student_resource_videos")
    .update(patch)
    .eq("id", videoId)
    .eq("student_id", auth.userId)
    .select("topic_id")
  if (error || !data?.length) return { success: false, error: "Kaydedilemedi." }
  const topicId = data[0].topic_id
  const learned = topicId ? await syncLearnedFromVideos(auth.userId, topicId) : false
  revalidateVideos()
  return { success: true, data: { learned } }
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
