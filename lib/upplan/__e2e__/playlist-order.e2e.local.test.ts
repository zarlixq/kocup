// Playlist konu sırası uçtan uca testi — TEST hesabıyla canlı DB'ye (ve YouTube
// önbelleğine / API'sine) gider. Test öğrencisine "55 Günde TYT Matematik Kampı"
// dün başlamış gün planıyla eklenir; yol haritası ve bu haftanın program taslağı
// üretilir: TYT Matematik konuları playlist sırasıyla, gelecek günlerin konuları
// bu haftada yok; kaydırma hedef tarihlerini kaydırır.
// Çalıştırma: E2E=1 npx vitest run lib/upplan/__e2e__/playlist-order.e2e.local.test.ts
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
import { applyPlan, shiftPlans } from "@/lib/resources/playlist-plan-service"
import { applyRoadmap, generateRoadmapDraft, syncPlaylistGoals, syncRoadmapProgress } from "@/lib/upplan/roadmap-service"
import { applyProgramDraft, countReplaceableItems, generateProgramDraft } from "@/lib/upplan/program-service"
import { isoWeekday } from "@/lib/resources/playlist-plan"
import { loadRoadmapView } from "@/lib/upplan/roadmap-view"
import { loadPlaylistScope } from "@/lib/upplan/playlist-scope"
import type { PlaylistScope } from "@/lib/upplan/playlist-order"

loadEnv()
type C = SupabaseClient<Database>
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const admin: C = createClient<Database>(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
const anon = () => createClient<Database>(URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } })
const E2E_EMAIL = "test-playlist@kocupakademi.com"
const E2E_PASS = "Test-Playlist-2026!x"
const CHANNEL = "https://www.youtube.com/@biyiklimatematik"
const TODAY = istanbulDateStr()
const YESTERDAY = addDaysIso(TODAY, -1)
const WEEK = istanbulWeekStartStr()
const WEEK_END = addDaysIso(WEEK, 6)
const report: Record<string, unknown> = { today: TODAY, week: `${WEEK}..${WEEK_END}` }

// Hafta içi 16:00–21:00, hafta sonu 10:00–17:00 (ızgara 06:00'dan, 30 dk slot).
const range = (a: number, b: number) => Array.from({ length: b - a }, (_, i) => a + i)
const AVAIL = { "1": range(20, 30), "2": range(20, 30), "3": range(20, 30), "4": range(20, 30), "5": range(20, 30), "6": range(8, 22), "7": range(8, 22) }

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

describe.sequential("playlist konu sırası e2e", () => {
  let A = ""
  let a: C
  let scope: PlaylistScope = {}
  let mathId = ""
  const topicNames = new Map<string, string>()

  it("hesap + UpPlan profili", { timeout: 60000 }, async () => {
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
  })

  it("Bıyıklı 55 Gün eklenir, dün başlamış gün planı", { timeout: 120000 }, async () => {
    const link = parseYoutubeLink(CHANNEL)
    if (link.kind !== "channel") throw new Error("kanal linki bekleniyordu")
    const ch = await fetchChannelPlaylists(link.channel)
    if ("error" in ch) throw new Error(ch.error)
    const kamp = ch.playlists.find((p) => /55 Günde TYT Matematik Kampı/i.test(p.title))!
    const yt = await getPlaylist(kamp.id)
    if ("error" in yt) throw new Error(yt.error)
    expect(yt.videos).toHaveLength(118)
    const { data: subject } = await admin.from("subjects").select("id").eq("name", "TYT Matematik").limit(1).single()
    mathId = subject!.id
    const { data: list, error: le } = await a
      .from("student_resource_playlists")
      .insert({
        student_id: A, subject_id: mathId, kind: "playlist", teacher_name: yt.channelTitle!, channel_title: yt.channelTitle,
        title: yt.title, youtube_playlist_id: kamp.id, source: "youtube", thumbnail_url: yt.thumbnailUrl, last_synced_at: new Date().toISOString(),
      })
      .select("id")
      .single()
    if (le) throw le
    const topics = await fetchActiveTopics(a, { subjectId: mathId })
    const rows = yt.videos.map((v) => {
      const m = matchVideoTopic(v.title, topics)
      return {
        student_id: A, playlist_id: list.id, youtube_video_id: v.videoId, title: v.title, position: v.position,
        duration_seconds: v.durationSeconds, thumbnail_url: v.thumbnailUrl, topic_id: m?.topic_id ?? null,
        match_status: m ? "oneri" : "eslesmedi", match_score: m?.score ?? null,
      }
    })
    const { error: ve } = await a.from("student_resource_videos").insert(rows)
    if (ve) throw ve
    const res = await applyPlan(a, A, list.id, { mode: "gun_yapisi", amount: null, start: YESTERDAY, weekdays: [1, 2, 3, 4, 5, 6, 7], orderTopics: true })
    expect(res.days).toBe(55)
    scope = (await loadPlaylistScope(a, A)).topics
    const { data: tn } = await admin.from("topics").select("id, name").in("id", Object.keys(scope))
    for (const t of tn ?? []) topicNames.set(t.id, t.name)
    const ordered = Object.entries(scope).sort((x, y) => (x[1].start ?? "").localeCompare(y[1].start ?? ""))
    report.scope = {
      topics: ordered.length,
      firstWeek: ordered.filter(([, t]) => (t.start ?? "") <= WEEK_END).map(([id, t]) => `${t.day}. Gün ${topicNames.get(id)}`),
      later: ordered.filter(([, t]) => (t.start ?? "") > WEEK_END).slice(0, 6).map(([id, t]) => `${t.day}. Gün ${topicNames.get(id)} (${t.start})`),
    }
    expect(ordered.length).toBeGreaterThan(10)
  })

  it("yol haritası: kapsamdaki konular playlist sırasıyla, gelecek günler sırada", { timeout: 180000 }, async () => {
    const draft = await generateRoadmapDraft(admin, A)
    if ("error" in draft) throw new Error(draft.error)
    const scoped = draft.payload.items.filter((i) => i.playlist)
    expect(scoped.length).toBe(Object.keys(scope).length)
    for (const it of scoped) {
      const t = scope[it.topic_id]
      expect(`${it.topic_name} ${t.start} ${t.started} ${it.status}`).toBe(`${it.topic_name} ${t.start} ${t.started} ${(t.start ?? "") <= TODAY || t.started ? "aktif" : "sirada"}`)
      expect(it.status).not.toBe("zaman_kalirsa")
    }
    const ap = await applyRoadmap(admin, A, A)
    expect(ap.error).toBeUndefined()
    await syncRoadmapProgress(admin, A)

    const view = await loadRoadmapView(a, A)
    expect(view.playlistChanged).toBe(false)
    const mathActive = view.rows.filter((r) => r.status === "aktif" && r.subject_name === "TYT Matematik")
    const mathActiveScoped = mathActive.filter((r) => r.playlist)
    // Aktif TYT Matematik konularının hepsi playlist'ten.
    expect(mathActiveScoped.length).toBe(mathActive.length)
    // Aktif TYT Matematik konuları playlist sırasında (ilk videonun tarihi azalmıyor).
    const starts = mathActiveScoped.map((r) => scope[r.topic_id].start ?? "")
    expect([...starts].sort()).toEqual(starts)
    expect(mathActiveScoped.every((r) => (scope[r.topic_id].start ?? "") <= TODAY)).toBe(true)
    const queue = view.rows.filter((r) => r.status === "sirada" && r.playlist)
    expect(queue.length).toBeGreaterThan(0)
    // Sıradaki playlist konuları playlist gün sırasıyla.
    const qStarts = queue.map((r) => r.start)
    expect([...qStarts].sort()).toEqual(qStarts)
    report.roadmap = {
      mathActive: mathActive.map((r) => `${r.topic_name}${r.playlist ? ` [${r.playlist}]` : " [UpPlan]"} → ${r.end}`),
      queueFirst: queue.slice(0, 5).map((r) => `${r.topic_name} [${r.playlist}] ${r.start}–${r.end}`),
      otherActive: view.rows.filter((r) => r.status === "aktif" && r.subject_name !== "TYT Matematik").map((r) => `${r.subject_name}: ${r.topic_name}`),
    }
  })

  it("bu haftanın programı: TYT Matematik'te yalnız bu haftanın playlist günlerinin konuları", { timeout: 120000 }, async () => {
    const res = await generateProgramDraft(admin, A, WEEK, TODAY)
    if ("error" in res) throw new Error(res.error)
    const math = res.items.filter((i) => i.subject_id === mathId && i.topic_id && !i.baslik.startsWith("Video:"))
    for (const i of math) {
      // TYT Matematik'te yalnız playlist konuları (eşlenmemişler playlist bitince).
      const t = scope[i.topic_id!]
      expect(t, i.baslik).toBeTruthy()
      expect((t.start ?? "") <= WEEK_END).toBe(true)
      // Soru bloğu ilk videonun plan gününden önce yok.
      const date = addDaysIso(WEEK, i.day_of_week - 1)
      if (t.notBefore) expect(date >= t.notBefore || t.notBefore < TODAY).toBe(true)
      if (!i.baslik.startsWith("Pratik")) expect(i.baslik).toMatch(/\(Bıyıklı \d+\. Gün\)$/)
    }
    expect(res.items.some((i) => i.baslik.startsWith("Konu çalışması") && i.topic_id && scope[i.topic_id])).toBe(false)
    const days = ["", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"]
    report.program = {
      meta: res.meta,
      items: res.items.map((i) => `${days[i.day_of_week]} ${i.start_time}–${i.end_time} ${i.baslik}`),
    }
  })

  it("bu haftayı yeniden oluştur: UpPlan kalemleri değişir, tamamlanan ve elle eklenen korunur", { timeout: 120000 }, async () => {
    const first = await applyProgramDraft(admin, admin, A, WEEK, A)
    expect(first.error).toBeUndefined()
    const load = async () => {
      const { data } = await admin
        .from("weekly_programs")
        .select("id, weekly_program_items(id, created_by_role, is_completed, day_of_week, baslik)")
        .eq("student_id", A)
        .eq("week_start", WEEK)
        .single()
      return data!
    }
    const prog = await load()
    const ai = prog.weekly_program_items.filter((i) => i.created_by_role === "ai")
    expect(ai.length).toBeGreaterThan(1)
    // Biri tamamlandı; öğrenci kendi kalemini ekledi (RLS ile, trigger 'student' yazar).
    await admin.from("weekly_program_items").update({ is_completed: true, completed_at: new Date().toISOString() }).eq("id", ai[0].id)
    const { data: own, error: oe } = await a
      .from("weekly_program_items")
      .insert({ program_id: prog.id, day_of_week: isoWeekday(TODAY), start_time: "23:00", end_time: "23:30", baslik: "Kendi çalışmam", order_index: 999 })
      .select("id, created_by_role")
      .single()
    if (oe) throw oe
    expect(own.created_by_role).toBe("student")

    const cnt = await countReplaceableItems(admin, A, WEEK, TODAY)
    expect(cnt.replace).toBe(ai.length - 1)
    expect(cnt.keep).toBe(2)
    const draft = await generateProgramDraft(admin, A, WEEK, TODAY, { replace: true })
    if ("error" in draft) throw new Error(draft.error)
    expect(draft.meta.replaceItemIds?.length).toBe(cnt.replace)
    const res = await applyProgramDraft(admin, admin, A, WEEK, A)
    expect(res.error).toBeUndefined()
    expect(res.replaced).toBe(cnt.replace)

    const after = (await load()).weekly_program_items
    const ids = new Set(after.map((i) => i.id))
    expect(ids.has(ai[0].id)).toBe(true)
    expect(ids.has(own.id)).toBe(true)
    expect(ai.slice(1).some((i) => ids.has(i.id))).toBe(false)
    expect(after.length).toBe(2 + (res.count ?? 0))
    report.rebuild = { before: ai.length + 1, replaced: res.replaced, added: res.count, kept: ["tamamlanan UpPlan bloğu", "öğrencinin kendi kalemi"], after: after.length }
  })

  it("kaydırma: playlist günleri ve yol haritası tarihleri bir gün kayar", { timeout: 120000 }, async () => {
    const { data: before } = await admin
      .from("topic_assignments")
      .select("id, topic_id, baslangic_tarihi, son_tarih")
      .eq("student_id", A)
      .eq("status", "sirada")
      .in("topic_id", Object.keys(scope))
      .order("baslangic_tarihi")
      .limit(3)
    const shift = await shiftPlans(a, A, TODAY)
    expect(shift.moved).toBeGreaterThan(0)
    const sync = await syncPlaylistGoals(admin, A, TODAY)
    expect(sync.updated).toBeGreaterThan(0)
    const { data: after } = await admin.from("topic_assignments").select("id, baslangic_tarihi, son_tarih").in("id", (before ?? []).map((b) => b.id))
    const byId = new Map((after ?? []).map((r) => [r.id, r]))
    for (const b of before ?? []) {
      expect(byId.get(b.id)!.baslangic_tarihi).toBe(addDaysIso(b.baslangic_tarihi, 1))
      expect(byId.get(b.id)!.son_tarih).toBe(addDaysIso(b.son_tarih, 1))
    }
    report.shift = (before ?? []).map((b) => `${topicNames.get(b.topic_id)}: ${b.baslangic_tarihi} → ${byId.get(b.id)!.baslangic_tarihi}`)
    writeFileSync("e2e-playlist-order-report.json", JSON.stringify(report, null, 2))
  })
})
