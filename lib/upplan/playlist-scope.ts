import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"
import { teacherDisplayName } from "@/lib/resources/videos"
import { buildPlaylistScope, buildPlaylistSubjects, type PlaylistContext, type ScopePlaylist } from "@/lib/upplan/playlist-order"

type Client = SupabaseClient<Database>

// Playlist konu sırası — DB okuma (çağıranın client'ı; RLS). Saf hesap
// playlist-order.ts'te; hedef tarihlerinin güncellenmesi roadmap-service.ts'te.

/** Öğrencinin playlist bağlamı: kapsamdaki konular ve dersler (aktif planlı, seçeneği açık playlist'ler). */
export async function loadPlaylistScope(db: Client, studentId: string): Promise<PlaylistContext> {
  const { data: lists, error } = await db
    .from("student_resource_playlists")
    .select("id, subject_id, status, plan_mode, order_topics, teacher_name, channel_title")
    .eq("student_id", studentId)
    .eq("kind", "playlist")
    .eq("status", "aktif")
    .eq("order_topics", true)
    .not("plan_mode", "is", null)
  if (error) console.error("loadPlaylistScope", error)
  if (!lists?.length) return { topics: {}, subjects: {} }
  const { data: videos, error: ve } = await db
    .from("student_resource_videos")
    .select("playlist_id, topic_id, match_status, plan_day, planned_date, watch_status, position, topics(subject_id)")
    .eq("student_id", studentId)
    .in("playlist_id", lists.map((l) => l.id))
    .range(0, 4999)
  if (ve) console.error("loadPlaylistScope videos", ve)
  const playlists: ScopePlaylist[] = lists.map((l) => ({
    id: l.id,
    name: teacherDisplayName(l),
    subject_id: l.subject_id,
    kind: "playlist",
    status: l.status,
    planned: !!l.plan_mode,
    order_topics: l.order_topics,
    videos: (videos ?? []).filter((v) => v.playlist_id === l.id).map((v) => ({ ...v, subject_id: v.topics?.subject_id ?? null })),
  }))
  return { topics: buildPlaylistScope(playlists), subjects: buildPlaylistSubjects(playlists) }
}
