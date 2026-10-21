import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"
import { addDaysIso } from "@/lib/upplan/roadmap"
import {
  ALL_WEEKDAYS,
  groupIntoDays,
  planDates,
  planUnits,
  reflowPlan,
  type PlanMode,
} from "@/lib/resources/playlist-plan"

type Client = SupabaseClient<Database>

// Playlist planı — DB yazımı (öğrencinin oturum client'ıyla; RLS kendi satırları).
// Hesap saf fonksiyonlarda (playlist-plan.ts).

export type PlanInput = { mode: PlanMode; amount: number | null; start: string; weekdays: number[] }

type PlanVideoRow = { id: string; title: string; duration_seconds: number | null; watch_status: string; plan_day: number | null; planned_date: string | null }

/** plan_day → video kimlikleri; her gün tek UPDATE (10'arlı paralel). */
async function writeDays(db: Client, studentId: string, rows: { ids: string[]; plan_day: number | null; planned_date: string | null }[]): Promise<boolean> {
  for (let i = 0; i < rows.length; i += 10) {
    const res = await Promise.all(
      rows.slice(i, i + 10).map((r) =>
        db
          .from("student_resource_videos")
          .update({ plan_day: r.plan_day, planned_date: r.planned_date })
          .in("id", r.ids)
          .eq("student_id", studentId),
      ),
    )
    const failed = res.find((r) => r.error)
    if (failed?.error) {
      console.error("playlist plan write", failed.error)
      return false
    }
  }
  return true
}

async function loadPlanVideos(db: Client, studentId: string, playlistId: string): Promise<PlanVideoRow[]> {
  const { data } = await db
    .from("student_resource_videos")
    .select("id, title, duration_seconds, watch_status, plan_day, planned_date")
    .eq("playlist_id", playlistId)
    .eq("student_id", studentId)
    .order("position")
  return data ?? []
}

/**
 * Planı kurar (ya da plan=null ile kaldırır). Videolar playlist sırasıyla
 * günlere bölünür; tamamı izlenmiş günler plana girmez, kalan günler
 * başlangıçtan itibaren seçili hafta günlerine dağılır.
 */
export async function applyPlan(
  db: Client,
  studentId: string,
  playlistId: string,
  plan: PlanInput | null,
): Promise<{ error?: string; days: number; end: string | null }> {
  const { error: pe } = await db
    .from("student_resource_playlists")
    .update({
      plan_mode: plan?.mode ?? null,
      plan_amount: plan && plan.mode !== "gun_yapisi" ? plan.amount : null,
      plan_start: plan?.start ?? null,
      plan_weekdays: plan ? plan.weekdays : null,
    })
    .eq("id", playlistId)
    .eq("student_id", studentId)
  if (pe) {
    console.error("applyPlan playlist", pe)
    return { error: "Plan kaydedilemedi.", days: 0, end: null }
  }
  const videos = await loadPlanVideos(db, studentId, playlistId)
  if (!plan) {
    const ok = await writeDays(db, studentId, [{ ids: videos.map((v) => v.id), plan_day: null, planned_date: null }].filter((r) => r.ids.length))
    return ok ? { days: 0, end: null } : { error: "Plan kaldırılamadı.", days: 0, end: null }
  }
  const groups = groupIntoDays(videos, plan.mode, plan.amount)
  // Tamamı izlenmiş günler plandan çıkar; kalanlar 1..n yeniden numaralanır.
  const pendingDays = Array.from(new Set(groups.filter((_, i) => videos[i].watch_status !== "izlendi")))
  const dates = planDates(pendingDays.length, plan.start, plan.weekdays)
  const newIndex = new Map(pendingDays.map((d, i) => [d, i]))
  const rows = new Map<string, { ids: string[]; plan_day: number | null; planned_date: string | null }>()
  videos.forEach((v, i) => {
    const idx = newIndex.get(groups[i])
    const key = idx === undefined ? "none" : String(idx)
    const row = rows.get(key) ?? { ids: [], plan_day: idx === undefined ? null : idx + 1, planned_date: idx === undefined ? null : dates[idx] }
    row.ids.push(v.id)
    rows.set(key, row)
  })
  const ok = await writeDays(db, studentId, Array.from(rows.values()))
  if (!ok) return { error: "Plan kaydedilemedi.", days: 0, end: null }
  return { days: pendingDays.length, end: dates.at(-1) ?? null }
}

/** Yenile ile gelen yeni videolar: aynı tempoyla son plan gününden sonraya eklenir. */
export async function extendPlan(db: Client, studentId: string, playlistId: string, plan: PlanInput): Promise<number> {
  const videos = await loadPlanVideos(db, studentId, playlistId)
  const fresh = videos.filter((v) => v.plan_day === null && v.watch_status !== "izlendi")
  if (fresh.length === 0) return 0
  const planned = videos.filter((v) => v.plan_day !== null && v.planned_date)
  const lastDay = Math.max(0, ...planned.map((v) => v.plan_day!))
  const lastDate = planned.reduce<string | null>((m, v) => (!m || v.planned_date! > m ? v.planned_date : m), null)
  const groups = groupIntoDays(fresh, plan.mode, plan.amount)
  const count = groups.at(-1) ?? 0
  const start = lastDate ? addDaysIso(lastDate, 1) : plan.start
  const dates = planDates(count, start, plan.weekdays)
  const rows = new Map<number, { ids: string[]; plan_day: number; planned_date: string }>()
  fresh.forEach((v, i) => {
    const d = groups[i]
    const row = rows.get(d) ?? { ids: [], plan_day: lastDay + d, planned_date: dates[d - 1] }
    row.ids.push(v.id)
    rows.set(d, row)
  })
  await writeDays(db, studentId, Array.from(rows.values()))
  return fresh.length
}

/**
 * Kaydır: aktif planlı playlist'lerin bekleyen günleri bugünden itibaren
 * yeniden tarihlenir (bkz. reflowPlan). `playlistId` verilirse yalnız o.
 */
export async function shiftPlans(db: Client, studentId: string, today: string, playlistId?: string): Promise<{ moved: number; error?: string }> {
  let q = db
    .from("student_resource_playlists")
    .select("id, plan_weekdays")
    .eq("student_id", studentId)
    .eq("status", "aktif")
    .not("plan_mode", "is", null)
  if (playlistId) q = q.eq("id", playlistId)
  const { data: lists, error } = await q
  if (error) return { moved: 0, error: "Plan okunamadı." }
  let moved = 0
  for (const l of lists ?? []) {
    const videos = await loadPlanVideos(db, studentId, l.id)
    const weekdays = l.plan_weekdays?.length ? l.plan_weekdays : [...ALL_WEEKDAYS]
    const changes = reflowPlan(planUnits(videos), today, weekdays)
    if (changes.size === 0) continue
    const rows = Array.from(changes, ([day, date]) => ({
      ids: videos.filter((v) => v.plan_day === day).map((v) => v.id),
      plan_day: day,
      planned_date: date,
    }))
    if (!(await writeDays(db, studentId, rows))) return { moved, error: "Plan kaydırılamadı." }
    moved += changes.size
  }
  return { moved }
}

// ── Bugün izleyeceklerin ─────────────────────────────────────────────────
export type AgendaVideo = {
  id: string
  playlist_id: string
  youtube_video_id: string
  title: string
  duration_seconds: number | null
  planned_date: string
  watch_status: "izlendi" | "izlenmedi"
  understanding: "anladim" | "kismen" | "anlamadim" | null
  topic_name: string | null
  playlist_name: string
  channel: string | null
  subject_name: string
}

export type VideoAgenda = {
  today: AgendaVideo[]
  overdue: AgendaVideo[]
  /** Gecikenlerin en yeni planlanan tarihi ("Dün planlanan …"). */
  lastOverdueDate: string | null
  /** Bugün sonraki çalışma günü değilse, sıradaki plan günü (boş gün mesajı). */
  nextDate: string | null
}

const asWatch = (v: string): AgendaVideo["watch_status"] => (v === "izlendi" ? "izlendi" : "izlenmedi")
const asUnderstanding = (v: string | null): AgendaVideo["understanding"] =>
  v === "anladim" || v === "kismen" || v === "anlamadim" ? v : null

/** Bugünün videoları + dünden ve öncesinden izlenmemişler (yalnız aktif playlist'ler). */
export async function loadVideoAgenda(db: Client, studentId: string, today: string): Promise<VideoAgenda> {
  const [{ data, error }, { data: next }] = await Promise.all([
    db
      .from("student_resource_videos")
      .select(
        "id, playlist_id, youtube_video_id, title, duration_seconds, planned_date, watch_status, understanding, position, topics(name), student_resource_playlists!inner(title, teacher_name, channel_title, status, subjects(name))",
      )
      .eq("student_id", studentId)
      .lte("planned_date", today)
      .gte("planned_date", addDaysIso(today, -60))
      .eq("student_resource_playlists.status", "aktif")
      .order("planned_date")
      .order("position")
      .limit(300),
    db
      .from("student_resource_videos")
      .select("planned_date, student_resource_playlists!inner(status)")
      .eq("student_id", studentId)
      .gt("planned_date", today)
      .eq("watch_status", "izlenmedi")
      .eq("student_resource_playlists.status", "aktif")
      .order("planned_date")
      .limit(1),
  ])
  if (error) console.error("loadVideoAgenda", error)
  const rows: AgendaVideo[] = (data ?? []).map((v) => {
    const p = v.student_resource_playlists
    const channel = p.channel_title ?? (/youtube\.com|https?:/i.test(p.teacher_name) ? null : p.teacher_name)
    return {
      id: v.id,
      playlist_id: v.playlist_id,
      youtube_video_id: v.youtube_video_id,
      title: v.title,
      duration_seconds: v.duration_seconds,
      planned_date: v.planned_date!,
      watch_status: asWatch(v.watch_status),
      understanding: asUnderstanding(v.understanding),
      topic_name: v.topics?.name ?? null,
      playlist_name: p.title?.trim() || channel || "Playlist",
      channel,
      subject_name: p.subjects?.name ?? "",
    }
  })
  const overdue = rows.filter((v) => v.planned_date < today && v.watch_status !== "izlendi")
  return {
    today: rows.filter((v) => v.planned_date === today),
    overdue,
    lastOverdueDate: overdue.reduce<string | null>((m, v) => (!m || v.planned_date > m ? v.planned_date : m), null),
    nextDate: next?.[0]?.planned_date ?? null,
  }
}

