// Playlist takip uçtan uca testi — TEST hesabıyla canlı DB'ye ve YouTube API'ye gider.
// Bıyıklı Matematik kanalından "55 Günde TYT Matematik Kampı" (118 video) bulunur,
// eklenir, gün yapısıyla planlanır; Bugün ekranı verisi, kaydırma ve UpPlan video
// bloğu doğrulanır.
// Çalıştırma: E2E=1 npx vitest run lib/resources/__e2e__/playlist.e2e.local.test.ts
// Temizlik:  node scripts/cleanup-playlist-e2e.mjs (önce --dry)
import { describe, expect, it } from "vitest"
import { writeFileSync } from "node:fs"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"
import { loadEnv } from "../../../scripts/lib/env.mjs"
import { istanbulDateStr, istanbulWeekStartStr } from "@/lib/tz"
import { addDaysIso } from "@/lib/upplan/roadmap"
import { fetchActiveTopics } from "@/lib/curriculum/active-topics"
import { matchVideoTopic, parseYoutubeLink } from "@/lib/resources/video-match"
import { fetchChannelPlaylists, getPlaylist } from "@/lib/resources/youtube"
import { detectDayStructure, groupIntoDays, planStatus } from "@/lib/resources/playlist-plan"
import { applyPlan, loadVideoAgenda, shiftPlans } from "@/lib/resources/playlist-plan-service"
import { loadPlaylists } from "@/lib/resources/videos"
import { linkPlaylistToYoutube } from "@/lib/resources/video-sync"
import { loadVideoDays } from "@/lib/upplan/program-service"
import { scheduleWeek } from "@/lib/upplan/scheduler"

loadEnv()
type C = SupabaseClient<Database>
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const admin: C = createClient<Database>(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
const anon = () => createClient<Database>(URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } })
export const E2E_EMAIL = "test-playlist@kocupakademi.com"
export const E2E_PASS = "Test-Playlist-2026!x"
const CHANNEL = "https://www.youtube.com/@biyiklimatematik"
const TODAY = istanbulDateStr()
const YESTERDAY = addDaysIso(TODAY, -1)
const report: Record<string, unknown> = { today: TODAY }

// Hafta içi 17:00–20:00, hafta sonu 10:00–14:00 (ızgara 06:00'dan, 30 dk slot).
const range = (a: number, b: number) => Array.from({ length: b - a }, (_, i) => a + i)
const AVAIL = { "1": range(22, 28), "2": range(22, 28), "3": range(22, 28), "4": range(22, 28), "5": range(22, 28), "6": range(8, 16), "7": range(8, 16) }

async function ensureUser(): Promise<string> {
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const found = list.users.find((u) => u.email === E2E_EMAIL)
  if (found) return found.id
  const { data, error } = await admin.auth.admin.createUser({
    email: E2E_EMAIL,
    password: E2E_PASS,
    email_confirm: true,
    user_metadata: { role: "student", full_name: "TEST Playlist" },
  })
  if (error) throw error
  return data.user!.id
}

describe.sequential("playlist takip e2e", () => {
  let A = ""
  let a: C
  let ytId = ""
  let playlistId = ""

  it("hesap + UpPlan müsaitliği", { timeout: 60000 }, async () => {
    A = await ensureUser()
    await admin.from("students").upsert({ id: A, grade: "12", coach_id: null, notes: "TEST playlist e2e" })
    a = anon()
    const { error: se } = await a.auth.signInWithPassword({ email: E2E_EMAIL, password: E2E_PASS })
    if (se) throw se
    const { error } = await a.from("student_upplan_profile").upsert({
      student_id: A, status: "lise", grade: 12, segment: "yks", alan: "sayisal",
      availability: AVAIL, focus_minutes: 45, setup_step: "bitti", completed_at: new Date().toISOString(),
    })
    if (error) throw error
    report.student = A
  })

  it("kanal linki → playlist listesi → 55 Günde TYT Matematik Kampı (118)", { timeout: 60000 }, async () => {
    const link = parseYoutubeLink(CHANNEL)
    expect(link.kind).toBe("channel")
    if (link.kind !== "channel") return
    const ch = await fetchChannelPlaylists(link.channel)
    if ("error" in ch) throw new Error(ch.error)
    const kamp = ch.playlists.find((p) => /55 Günde TYT Matematik Kampı/i.test(p.title) && p.itemCount === 118)
    expect(kamp).toBeTruthy()
    ytId = kamp!.id
    report.channel = { title: ch.channelTitle, playlists: ch.playlists.length, picked: kamp }
  })

  it("118 video sayfalı gelir, süreler dolu; ikinci çağrı önbellekten", { timeout: 120000 }, async () => {
    const yt = await getPlaylist(ytId, { force: true })
    if ("error" in yt) throw new Error(yt.error)
    expect(yt.videos).toHaveLength(118)
    expect(yt.videos.every((v) => v.durationSeconds != null)).toBe(true)
    expect(yt.channelTitle).toBe("Bıyıklı Matematik")
    const again = await getPlaylist(ytId)
    expect("error" in again ? null : again.cached).toBe(true)
    const titles = yt.videos.map((v) => v.title)
    const ds = detectDayStructure(titles)
    const groups = groupIntoDays(yt.videos.map((v) => ({ title: v.title, duration_seconds: v.durationSeconds })), "gun_yapisi", null)
    expect(ds.detected).toBe(true)
    expect(groups.at(-1)).toBe(55)
    report.playlist = {
      title: yt.title,
      channel: yt.channelTitle,
      videos: yt.videos.length,
      totalHours: Math.round(yt.videos.reduce((s, v) => s + (v.durationSeconds ?? 0), 0) / 360) / 10,
      dayStructure: ds,
      day1: groups.filter((g) => g === 1).length,
    }
  })

  it("öğrenci olarak ekle (RLS) + gün yapısı planı (dün başladı)", { timeout: 120000 }, async () => {
    const yt = await getPlaylist(ytId)
    if ("error" in yt) throw new Error(yt.error)
    const { data: subject } = await admin.from("subjects").select("id, name").eq("name", "TYT Matematik").limit(1).maybeSingle()
    expect(subject).toBeTruthy()
    const { data: list, error: le } = await a
      .from("student_resource_playlists")
      .insert({
        student_id: A, subject_id: subject!.id, kind: "playlist", teacher_name: yt.channelTitle!, channel_title: yt.channelTitle,
        title: yt.title, youtube_playlist_id: ytId, source: "youtube", thumbnail_url: yt.thumbnailUrl, last_synced_at: new Date().toISOString(),
      })
      .select("id")
      .single()
    if (le) throw le
    playlistId = list.id
    const topics = await fetchActiveTopics(a, { subjectId: subject!.id })
    let matched = 0
    const rows = yt.videos.map((v) => {
      const m = matchVideoTopic(v.title, topics)
      if (m) matched += 1
      return {
        student_id: A, playlist_id: playlistId, youtube_video_id: v.videoId, title: v.title, position: v.position,
        duration_seconds: v.durationSeconds, thumbnail_url: v.thumbnailUrl, topic_id: m?.topic_id ?? null,
        match_status: m ? "oneri" : "eslesmedi", match_score: m?.score ?? null,
      }
    })
    const { error: ve } = await a.from("student_resource_videos").insert(rows)
    if (ve) throw ve
    const res = await applyPlan(a, A, playlistId, { mode: "gun_yapisi", amount: null, start: YESTERDAY, weekdays: [1, 2, 3, 4, 5, 6, 7] })
    expect(res.error).toBeUndefined()
    expect(res.days).toBe(55)
    const [p] = await loadPlaylists(a, A)
    expect(p.videos).toHaveLength(118)
    expect(p.plan?.mode).toBe("gun_yapisi")
    report.added = { matched, planDays: res.days, planEnd: res.end }
  })

  it("Bugün: dünün videoları geciken, bugünün videoları 2. gün", { timeout: 60000 }, async () => {
    const ag = await loadVideoAgenda(a, A, TODAY)
    expect(ag.overdue).toHaveLength(3) // tanıtım + 1. gün (2 video)
    expect(ag.lastOverdueDate).toBe(YESTERDAY)
    expect(ag.today).toHaveLength(2)
    expect(ag.today.every((v) => /2\. Gün/.test(v.title))).toBe(true)
    expect(ag.today[0].channel).toBe("Bıyıklı Matematik")
    const [p] = await loadPlaylists(a, A)
    const st = planStatus(p.videos, TODAY, p.plan!.weekdays)
    expect(st.offsetDays).toBe(-1)
    report.beforeShift = { today: ag.today.map((v) => v.title), overdue: ag.overdue.length, status: st }
  })

  it("Kaydır: geciken 1. gün bugüne, kalan plan bir gün ileri", { timeout: 60000 }, async () => {
    const before = await loadPlaylists(a, A)
    const lastBefore = before[0].videos.map((v) => v.planned_date!).sort().at(-1)!
    const res = await shiftPlans(a, A, TODAY, playlistId)
    expect(res.error).toBeUndefined()
    expect(res.moved).toBe(55)
    const ag = await loadVideoAgenda(a, A, TODAY)
    expect(ag.overdue).toHaveLength(0)
    expect(ag.today).toHaveLength(3)
    const [p] = await loadPlaylists(a, A)
    const lastAfter = p.videos.map((v) => v.planned_date!).sort().at(-1)!
    expect(lastAfter).toBe(addDaysIso(lastBefore, 1))
    const st = planStatus(p.videos, TODAY, p.plan!.weekdays)
    expect(st.offsetDays).toBe(0)
    report.afterShift = { today: ag.today.map((v) => v.title), plannedEnd: lastAfter, status: st }
    // Dashboard render kontrolü için: bugün tekrar "dünden kalan" durumu kurulsun
    // diye plan yeniden dünden başlatılır (sayfa testi gecikenleri ve bugünü görür).
    const again = await applyPlan(a, A, playlistId, { mode: "gun_yapisi", amount: null, start: YESTERDAY, weekdays: [1, 2, 3, 4, 5, 6, 7] })
    expect(again.days).toBe(55)
  })

  it("Düzelt: kanal linkiyle eklenmiş eksik kayıt playlist'e bağlanır, izleme işareti korunur", { timeout: 120000 }, async () => {
    const { data: subject } = await admin.from("subjects").select("id").eq("name", "TYT Matematik").limit(1).single()
    // Canlıdaki hatalı kaydın kopyası (eski elle-liste akışı): hoca adı = kanal linki, tek video "Video 1" izlendi.
    const { data: broken, error } = await a
      .from("student_resource_playlists")
      .insert({ student_id: A, subject_id: subject!.id, kind: "playlist", teacher_name: CHANNEL, source: "manuel", issue: "kanal_linki" })
      .select("id")
      .single()
    if (error) throw error
    const { data: kept } = await a
      .from("student_resource_videos")
      .insert({ student_id: A, playlist_id: broken.id, youtube_video_id: "5T8DN1S2YwI", title: "Video 1", position: 0, watch_status: "izlendi", watched_at: new Date().toISOString() })
      .select("id")
      .single()
    // Aynı playlist bu hesapta zaten ekli → benzersizlik hatası (çift kayıt yok).
    const dup = await linkPlaylistToYoutube(a, A, broken.id, ytId)
    expect("error" in dup && dup.error).toBe("Bu playlist başka bir kartta zaten ekli.")
    // Başka bir kanal playlist'ine bağla (40 Denemede Problemler Rutinim Kampı).
    const link = parseYoutubeLink(CHANNEL)
    if (link.kind !== "channel") throw new Error("kanal")
    const ch = await fetchChannelPlaylists(link.channel)
    if ("error" in ch) throw new Error(ch.error)
    const other = ch.playlists.find((p) => p.id !== ytId && p.itemCount > 10 && p.itemCount < 60)!
    const res = await linkPlaylistToYoutube(a, A, broken.id, other.id)
    if ("error" in res) throw new Error(res.error)
    const lists = await loadPlaylists(a, A)
    const fixed = lists.find((p) => p.id === broken.id)!
    expect(fixed.issue).toBeNull()
    expect(fixed.title).toBe(other.title)
    expect(fixed.channel_title).toBe("Bıyıklı Matematik")
    expect(fixed.videos.length).toBe(res.videos + 1) // eski "Video 1" korunur (sona alınır)
    expect(fixed.videos.find((v) => v.id === kept!.id)?.watch_status).toBe("izlendi")
    report.fix = { playlist: other.title, videos: fixed.videos.length, kept: "Video 1 korundu" }
  })

  it("UpPlan: haftanın video günleri programda ayrı blok, müsaitlik aşılmaz", { timeout: 60000 }, async () => {
    const weekStart = istanbulWeekStartStr()
    const days = await loadVideoDays(admin, A, weekStart, [])
    expect(days.length).toBeGreaterThan(0)
    const r = scheduleWeek({
      weekStart, today: TODAY, availability: AVAIL, focusMinutes: 45, loadFactor: 1, segment: "yks", weeksLeft: 30,
      minutesPerQuestion: 1.5, goals: [], reviews: [], fixed: [], videoDays: days,
    })
    const videoBlocks = r.items.filter((i) => i.baslik.startsWith("Video:"))
    expect(videoBlocks.length).toBeGreaterThan(0)
    for (const d of [1, 2, 3, 4, 5, 6, 7]) {
      const used = r.items
        .filter((i) => i.day_of_week === d)
        .reduce((s, i) => s + (Number(i.end_time.slice(0, 2)) * 60 + Number(i.end_time.slice(3))) - (Number(i.start_time.slice(0, 2)) * 60 + Number(i.start_time.slice(3))), 0)
      expect(used).toBeLessThanOrEqual((AVAIL[String(d) as keyof typeof AVAIL]?.length ?? 0) * 30)
    }
    report.upplan = { videoDays: days, videoBlocks, meta: r.meta }
    writeFileSync(process.env.E2E_REPORT ?? "playlist-e2e-report.json", JSON.stringify(report, null, 2))
  })
})
