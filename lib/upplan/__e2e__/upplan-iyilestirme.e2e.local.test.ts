// UpPlan iyileştirme uçtan uca testi — TEST hesabıyla canlı DB'ye yazar.
// Profil: mezun, sayısal, 11-12. sınıf konularını görmemiş, haftada 23 saat, koçsuz.
// Çalıştırma: E2E=1 npx vitest run lib/upplan/__e2e__/upplan-iyilestirme.e2e.local.test.ts
// Temizlik: node scripts/cleanup-upplan-e2e.mjs (önce --dry)
import { describe, expect, it } from "vitest"
import { writeFileSync } from "node:fs"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"
import { loadEnv } from "../../../scripts/lib/env.mjs"
import { istanbulDateStr, istanbulWeekStartStr } from "@/lib/tz"
import { loadScanData } from "@/lib/upplan/load"
import { applyRoadmap, generateRoadmapDraft, redateQueue, syncRoadmapProgress } from "@/lib/upplan/roadmap-service"
import { applyProgramDraft, generateProgramDraft, ROADMAP_REQUIRED_ERROR } from "@/lib/upplan/program-service"
import { addDaysIso } from "@/lib/upplan/roadmap"
import { toUpplanProfile } from "@/lib/upplan/profile"
import { loadAssignmentsWithProgress } from "@/lib/assignments/load"
import { getStudentWeeklyCompliance } from "@/lib/analytics/compliance"
import { matchVideoTopic } from "@/lib/resources/video-match"
import { topicVideosComplete } from "@/lib/resources/videos"
import { DAYS } from "@/lib/days"

loadEnv()
type C = SupabaseClient<Database>
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const admin: C = createClient<Database>(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
const anon = () => createClient<Database>(URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } })
const PASS = "Test-UpPlan-2026!x"
const EMAIL = "test-upplan-mezun@kocupakademi.com"
const TODAY = istanbulDateStr()
const NEXT_WEEK = addDaysIso(istanbulWeekStartStr(), 7)
const report: Record<string, unknown> = {}

// Haftada 23 saat: hafta içi 17:00–20:00 (5 × 3 sa) + hafta sonu 10:00–14:00 (2 × 4 sa).
const range = (a: number, b: number) => Array.from({ length: b - a }, (_, i) => a + i)
const WK = range(22, 28)
const WE = range(8, 16)
const AVAIL = { "1": WK, "2": WK, "3": WK, "4": WK, "5": WK, "6": WE, "7": WE }

async function ensureUser(): Promise<string> {
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const found = list.users.find((u) => u.email === EMAIL)
  if (found) return found.id
  const { data, error } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASS,
    email_confirm: true,
    user_metadata: { role: "student", full_name: "TEST UpPlan Mezun" },
  })
  if (error) throw error
  return data.user!.id
}

describe.sequential("UpPlan iyileştirme e2e", () => {
  let A = ""
  let a: C
  let subjectName = new Map<string, string>()

  it("hesap + kurulum (koçsuz, mezun sayısal, 23 saat) + tarama", { timeout: 120000 }, async () => {
    A = await ensureUser()
    await admin.from("students").upsert({ id: A, grade: "Mezun", coach_id: null, notes: "TEST UpPlan iyileştirme e2e" })
    a = anon()
    const { error: se } = await a.auth.signInWithPassword({ email: EMAIL, password: PASS })
    if (se) throw se
    // Öğrenci oturumuyla (RLS) — kurulum sihirbazının yazdığı satır.
    const { error } = await a.from("student_upplan_profile").upsert({
      student_id: A, status: "mezun", grade: null, segment: "yks", alan: "sayisal",
      availability: AVAIL, focus_minutes: 45, setup_step: "bitti", completed_at: new Date().toISOString(),
    })
    if (error) throw error
    const { data: prof } = await a.from("student_upplan_profile").select("*").eq("student_id", A).single()
    const scan = await loadScanData(a, A, toUpplanProfile(prof!))
    const rows = scan.subjects.flatMap((s) => s.topics.map((t) => ({ student_id: A, topic_id: t.id, status: (t.grade ?? 0) >= 11 ? "hic_gormedim" : "eksik" })))
    const { error: ae } = await a.from("student_topic_self_assessment").upsert(rows)
    if (ae) throw ae
    const avail = Object.values(AVAIL).reduce((n, s) => n + s.length, 0) * 30
    report.setup = { student: A, topics: rows.length, availableHours: avail / 60 }
    expect(avail).toBe(23 * 60)
    const { data: subjects } = await admin.from("subjects").select("id, name")
    subjectName = new Map((subjects ?? []).map((s) => [s.id, s.name]))
  })

  it("yol haritası yokken program üretilmez", { timeout: 60000 }, async () => {
    const r = await generateProgramDraft(admin, A, NEXT_WEEK, TODAY)
    expect("error" in r && r.error).toBe(ROADMAP_REQUIRED_ERROR)
  })

  it("yol haritası: AYT kapısı kapalı, aktif ≤ 6, öğrenmede ≤ 4, farklı bitiş tarihleri", { timeout: 120000 }, async () => {
    const r = await generateRoadmapDraft(admin, A)
    if ("error" in r) throw new Error(r.error)
    const p = r.payload
    const active = p.items.filter((i) => i.status === "aktif" && !i.practice)
    const ayt = (n: string) => n.startsWith("AYT")
    const ranked = p.items.filter((i) => !i.practice).sort((x, y) => (y.efficiency ?? 0) - (x.efficiency ?? 0))
    const zBySubject: Record<string, number> = {}
    for (const i of p.items) if (i.status === "zaman_kalirsa") zBySubject[i.subject_name] = (zBySubject[i.subject_name] ?? 0) + 1
    report.efficiency = {
      top15: ranked.slice(0, 15).map((i) => `${i.subject_name} / ${i.topic_name}: ${i.efficiency} puan/sa [${i.status}]`),
      subjectHours: p.subjectHours,
      zamanKalirsaBySubject: zBySubject,
      practice: p.items.filter((i) => i.practice).map((i) => `${i.subject_name} / ${i.topic_name}`),
    }
    // Sıralama verimliliğe göre: zaman kalırsa'ya düşenler en düşük verimliler (kapıdan bağımsız konular).
    const planned = p.items.filter((i) => !i.practice && i.status !== "zaman_kalirsa" && !ayt(i.subject_name))
    const dropped = p.items.filter((i) => i.status === "zaman_kalirsa" && !ayt(i.subject_name))
    if (dropped.length && planned.length) {
      expect(Math.max(...dropped.map((i) => i.efficiency ?? 0))).toBeLessThanOrEqual(Math.min(...planned.map((i) => i.efficiency ?? 0)) + 1e-9)
    }
    expect(p.items.filter((i) => i.practice).length).toBeGreaterThan(0)
    report.roadmap = {
      weeklyMinutes: p.weeklyMinutes,
      activeSlots: p.activeSlots,
      aytForceStart: p.aytForceStart,
      notes: p.notes,
      counts: { aktif: active.length, sirada: p.items.filter((i) => i.status === "sirada").length, zaman_kalirsa: p.items.filter((i) => i.status === "zaman_kalirsa").length },
      active: active.map((i) => `${i.subject_name} / ${i.topic_name} [${i.learning_phase}] ${i.start}→${i.end}`),
      firstAyt: p.items.filter((i) => ayt(i.subject_name)).slice(0, 3).map((i) => `${i.subject_name} / ${i.topic_name} ${i.start} — ${i.reasons.find((x) => x.includes("TYT") || x.includes("hafta"))}`),
    }
    expect(active.length).toBeLessThanOrEqual(6)
    expect(active.filter((i) => i.learning_phase === "gerekli").length).toBeLessThanOrEqual(4)
    expect(active.some((i) => ayt(i.subject_name))).toBe(false)
    expect(new Set(active.map((i) => i.end)).size).toBeGreaterThan(1)
    // İlk AYT konusu ya kapı açılınca ya da sınava 26 hafta kala başlar.
    const firstAyt = p.items.find((i) => ayt(i.subject_name) && i.status !== "zaman_kalirsa")
    if (firstAyt) expect(firstAyt.start >= TODAY).toBe(true)

    // Öğrenci onayı (approveMyRoadmap ile aynı adımlar).
    const ap = await applyRoadmap(admin, A, A)
    expect(ap.error).toBeUndefined()
    await syncRoadmapProgress(admin, A)
    await redateQueue(admin, A)
    const goals = (await loadAssignmentsWithProgress(admin, { studentId: A })).filter((g) => g.status === "aktif" && !g.is_practice)
    report.goals = goals.map((g) => `${g.subject_name} / ${g.topic_name} · ${g.learning_phase} · bitiş ${g.son_tarih}`)
    expect(goals.length).toBeLessThanOrEqual(6)
    expect(goals.every((g) => !g.subject_name.startsWith("AYT"))).toBe(true)
  })

  it("ilk hafta programı: AYT yok, her konunun ilk bloğu konu çalışması, 1 deneme, aktif ≤ 6", { timeout: 120000 }, async () => {
    const r = await generateProgramDraft(admin, A, NEXT_WEEK, TODAY)
    if ("error" in r) throw new Error(r.error)
    const items = r.items
    const exams = items.filter((i) => i.block_type === "deneme")
    const key = (i: { day_of_week: number; start_time: string }) => i.day_of_week * 10000 + Number(i.start_time.replace(":", ""))
    const practiceIds = new Set(
      (await loadAssignmentsWithProgress(admin, { studentId: A })).filter((g) => g.is_practice).map((g) => g.id),
    )
    const byGoal = new Map<string, typeof items>()
    for (const i of items) if (i.assignment_id && !practiceIds.has(i.assignment_id)) (byGoal.get(i.assignment_id) ?? byGoal.set(i.assignment_id, []).get(i.assignment_id)!).push(i)
    const practiceBlocks = items.filter((i) => i.assignment_id && practiceIds.has(i.assignment_id) && i.baslik.startsWith("Pratik"))
    const firstBlocks = Array.from(byGoal.values()).map((list) => [...list].sort((x, y) => key(x) - key(y))[0])
    const lectures = items.filter((i) => i.block_type === "konu_calisma")
    const mins = (i: { start_time: string; end_time: string }) => {
      const [ah, am] = i.start_time.split(":").map(Number)
      const [bh, bm] = i.end_time.split(":").map(Number)
      return bh * 60 + bm - ah * 60 - am
    }

    report.program = {
      week: NEXT_WEEK,
      meta: r.meta,
      summary: DAYS.map((d) => {
        const list = items.filter((i) => i.day_of_week === d.num)
        return `${d.label}: ${list.map((i) => `${i.start_time}-${i.end_time} ${i.subject_id ? subjectName.get(i.subject_id) + " · " : ""}${i.baslik}${i.hedef_soru ? ` (${i.hedef_soru} soru)` : ""}`).join(" | ") || "—"}`
      }),
    }
    expect(items.some((i) => i.subject_id && subjectName.get(i.subject_id)?.startsWith("AYT"))).toBe(false)
    expect(firstBlocks.every((b) => b.block_type === "konu_calisma")).toBe(true)
    expect(lectures.filter((l) => l.baslik.startsWith("Konu çalışması")).every((l) => mins(l) >= 90)).toBe(true)
    expect(exams).toHaveLength(1)
    expect(r.meta.examCount).toBe(1)
    expect(byGoal.size).toBeLessThanOrEqual(6)
    // Sürekli pratik: paragraf (3) + problemler (2) blok, öğrenilmiş konular varsa.
    expect(practiceBlocks.length).toBeGreaterThan(0)

    // Öğrenci onaylar → program; sayaç ile programdaki deneme tutarlı.
    const ap = await applyProgramDraft(admin, admin, A, NEXT_WEEK, A)
    expect(ap.error).toBeUndefined()
    const { data: prog } = await admin.from("weekly_programs").select("weekly_program_items(block_type)").eq("student_id", A).eq("week_start", NEXT_WEEK).single()
    const written = (prog?.weekly_program_items ?? []).filter((i) => i.block_type === "deneme").length
    const again = await generateProgramDraft(admin, A, NEXT_WEEK, TODAY)
    if ("error" in again) throw new Error(again.error)
    report.examCounter = { programdaDeneme: written, yenidenOnerideSayac: again.meta.examCount, yeniDenemeKalemi: again.items.filter((i) => i.block_type === "deneme").length }
    expect(again.meta.examCount).toBe(written)
    expect(again.items.filter((i) => i.block_type === "deneme")).toHaveLength(0)
  })

  it("gün bazlı uyum: tek fonksiyon (geçmiş hafta gibi tüm günler)", { timeout: 60000 }, async () => {
    // Gelecek haftanın programı: henüz hiçbir gün sayılmaz → null.
    const c = await getStudentWeeklyCompliance(a, A, NEXT_WEEK)
    expect(c?.percent ?? null).toBeNull()
  })

  it("video playlist: eşleşme, izledim + anladım → öğrenme aşaması biter", { timeout: 120000 }, async () => {
    const goal = (await loadAssignmentsWithProgress(admin, { studentId: A })).find((g) => g.status === "aktif" && g.learning_phase === "gerekli")
    if (!goal) {
      report.video = "öğrenme aşamasında aktif hedef yok"
      return
    }
    const { data: pl, error } = await a
      .from("student_resource_playlists")
      .insert({ student_id: A, subject_id: goal.subject_id, teacher_name: "TEST Hoca", source: "manuel" })
      .select("id")
      .single()
    if (error) throw error
    const title = `${goal.topic_name} | Konu Anlatımı`
    const m = matchVideoTopic(title, [{ id: goal.topic_id, name: goal.topic_name }, { id: "x", name: "Başka Konu" }])
    expect(m?.topic_id).toBe(goal.topic_id)
    const { data: v, error: ve } = await a
      .from("student_resource_videos")
      .insert({ student_id: A, playlist_id: pl!.id, youtube_video_id: "AAAAAAAAAAA", title, position: 0, topic_id: goal.topic_id, match_status: "oneri", match_score: m!.score })
      .select("id")
      .single()
    if (ve) throw ve
    // markVideo ile aynı: öğrenci işaretler, tamamlanınca service role learned_at yazar.
    await a.from("student_resource_videos").update({ watch_status: "izlendi", watched_at: new Date().toISOString(), understanding: "anladim" }).eq("id", v!.id)
    expect(await topicVideosComplete(a, A, goal.topic_id)).toBe(true)
    await admin
      .from("topic_assignments")
      .update({ learned_at: new Date().toISOString() })
      .eq("student_id", A)
      .eq("topic_id", goal.topic_id)
      .in("status", ["aktif", "sirada"])
      .is("learned_at", null)
    const after = (await loadAssignmentsWithProgress(admin, { studentId: A })).find((g) => g.id === goal.id)!
    expect(after.learned_at).not.toBeNull()
    // Başka kullanıcının playlist'ine video eklenemez (RLS/trigger).
    const { error: foreign } = await a
      .from("student_resource_videos")
      .insert({ student_id: "00000000-0000-0000-0000-000000000000", playlist_id: pl!.id, youtube_video_id: "BBBBBBBBBBB", title: "x" })
    expect(foreign).not.toBeNull()
    report.video = { topic: goal.topic_name, learned_at: after.learned_at }
  })

  it("rapor", () => {
    writeFileSync(process.env.E2E_REPORT ?? "upplan-iyilestirme-e2e.json", JSON.stringify(report, null, 2))
  })
})
