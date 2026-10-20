// UpPlan uçtan uca test — TEST hesaplarıyla canlı DB'ye gerçekten yazar.
// Server action'lar cookie/oturum gerektirdiği için her adım action'ın yaptığını
// aynı client'larla tekrarlar: oturum işlemleri öğrenci/koç oturumuyla (RLS),
// servis işlemleri service role ile. Cron lokal dev sunucusuna HTTP ile çağrılır.
import { describe, expect, it } from "vitest"
import { writeFileSync } from "node:fs"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"
import { loadEnv } from "../../../scripts/lib/env.mjs"
import { istanbulDateStr, istanbulWeekStartStr } from "@/lib/tz"
import { loadScanData, loadToday } from "@/lib/upplan/load"
import { applyRoadmap, generateRoadmapDraft, parsePayload, redateQueue, syncRoadmapProgress } from "@/lib/upplan/roadmap-service"
import { applyProgramDraft, generateProgramDraft } from "@/lib/upplan/program-service"
import { loadRoadmapView } from "@/lib/upplan/roadmap-view"
import { addDaysIso, prereqViolations } from "@/lib/upplan/roadmap"
import { loadAssignmentsWithProgress } from "@/lib/assignments/load"
import { toUpplanProfile } from "@/lib/upplan/profile"

loadEnv()
type C = SupabaseClient<Database>
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const admin: C = createClient<Database>(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
const anon = () => createClient<Database>(URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } })
const PASS = "Test-UpPlan-2026!x"
const EMAILS = { student: "test-upplan@kocupakademi.com", coached: "test-upplan-koclu@kocupakademi.com", coach: "test-upplan-koc@kocupakademi.com" }
const TODAY = istanbulDateStr()
const WEEK = istanbulWeekStartStr()
const report: Record<string, unknown> = {}

const range = (a: number, b: number) => Array.from({ length: b - a }, (_, i) => a + i)
const WK = range(22, 32) // 17:00-22:00
const WE = range(8, 20) // 10:00-16:00
const AVAIL_NORMAL = { "1": WK, "2": WK, "3": WK, "4": WK, "5": WK, "6": WE, "7": WE }
const AVAIL_LOW = { "2": range(26, 28), "4": range(26, 28), "6": range(8, 12) }

async function ensureUser(email: string, role: "student" | "coach", name: string): Promise<string> {
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const found = list.users.find((u) => u.email === email)
  if (found) return found.id
  // Rol yalnız tek kullanımlık hibeden alınır (migration 218).
  const { data: grant } = await admin.from("auth_role_grants").insert({ email, role }).select("id").single()
  const { data, error } = await admin.auth.admin.createUser({ email, password: PASS, email_confirm: true, user_metadata: { role, full_name: name, role_grant: grant!.id } })
  if (error) throw error
  return data.user!.id
}

async function signIn(email: string): Promise<C> {
  const c = anon()
  const { error } = await c.auth.signInWithPassword({ email, password: PASS })
  if (error) throw error
  return c
}

async function setProfile(c: C, studentId: string, availability: Record<string, number[]>) {
  // saveUpplanProfile + advanceSetup('bitti') ile aynı (oturum client'ı).
  const { error } = await c.from("student_upplan_profile").upsert({
    student_id: studentId, status: "mezun", grade: null, segment: "yks", alan: "sayisal",
    availability, focus_minutes: 45, setup_step: "bitti", completed_at: new Date().toISOString(),
  })
  if (error) throw error
}

async function scan(c: C, studentId: string, statusFor: (grade: number | null) => "hic_gormedim" | "eksik" | "biliyorum") {
  const { data: prof } = await c.from("student_upplan_profile").select("*").eq("student_id", studentId).single()
  const data = await loadScanData(c, studentId, toUpplanProfile(prof!))
  const rows = data.subjects.flatMap((s) => s.topics.map((t) => ({ student_id: studentId, topic_id: t.id, status: statusFor(t.grade) })))
  const { error } = await c.from("student_topic_self_assessment").upsert(rows)
  if (error) throw error
  return { topics: rows.length, grade11: data.subjects.flatMap((s) => s.topics).filter((t) => t.grade === 11).length, grade12: data.subjects.flatMap((s) => s.topics).filter((t) => t.grade === 12).length }
}

function summarize(payload: NonNullable<ReturnType<typeof parsePayload>>) {
  const cnt = { aktif: 0, sirada: 0, zaman_kalirsa: 0 }
  const bt = { konu_calisma: 0, soru_cozum: 0, tekrar: 0 }
  for (const i of payload.items) {
    cnt[i.status]++
    bt[i.block_type]++
  }
  return {
    weeklyMinutes: payload.weeklyMinutes, activeSlots: payload.activeSlots, cnt, blockTypes: bt,
    overflow: payload.overflow?.message ?? null, broken: payload.brokenCycles.length,
    firstWave: payload.items.filter((i) => i.status === "aktif").map((i) => `${i.subject_name}/${i.topic_name} [${i.block_type}] — ${i.reasons[0]}`),
    examReasons: payload.items.filter((i) => i.reasons.some((r) => r.startsWith("Denemende"))).length,
  }
}

describe.sequential("UpPlan e2e", () => {
  let A = "", B = "", K = ""
  let a: C, b: C, k: C

  it("hesaplar", { timeout: 60000 }, async () => {
    K = await ensureUser(EMAILS.coach, "coach", "TEST UpPlan Koç")
    A = await ensureUser(EMAILS.student, "student", "TEST UpPlan Öğrenci")
    B = await ensureUser(EMAILS.coached, "student", "TEST UpPlan Koçlu Öğrenci")
    await admin.from("students").upsert([
      { id: A, grade: "Mezun", coach_id: null, notes: "TEST UpPlan e2e" },
      { id: B, grade: "Mezun", coach_id: K, notes: "TEST UpPlan e2e" },
    ])
    a = await signIn(EMAILS.student)
    b = await signIn(EMAILS.coached)
    k = await signIn(EMAILS.coach)
    report.accounts = { A, B, K }
  })

  it("S2 konuları bilen öğrenci → hepsi tekrar", { timeout: 120000 }, async () => {
    await setProfile(a, A, AVAIL_NORMAL)
    report.s2_scan = await scan(a, A, () => "biliyorum")
    const r = await generateRoadmapDraft(admin, A)
    if ("error" in r) throw new Error(r.error)
    const s = summarize(r.payload)
    report.s2 = s
    expect(s.blockTypes.tekrar).toBe(r.payload.items.length)
  })

  it("S4 kapasitesi yetmeyen öğrenci → zaman kalırsa + mesaj", { timeout: 120000 }, async () => {
    await setProfile(a, A, AVAIL_LOW)
    await scan(a, A, (g) => ((g ?? 0) >= 11 ? "hic_gormedim" : "eksik"))
    const r = await generateRoadmapDraft(admin, A)
    if ("error" in r) throw new Error(r.error)
    const s = summarize(r.payload)
    report.s4 = s
    expect(s.cnt.zaman_kalirsa).toBeGreaterThan(0)
    expect(s.overflow).toContain("yetişemiyorsun")
  })

  it("S1 + S3 mezun sayısal, 11-12 görmemiş, denemesiz → taslak + onay", { timeout: 120000 }, async () => {
    await setProfile(a, A, AVAIL_NORMAL)
    report.s1_scan = await scan(a, A, (g) => ((g ?? 0) >= 11 ? "hic_gormedim" : "eksik"))
    const r = await generateRoadmapDraft(admin, A)
    if ("error" in r) throw new Error(r.error)
    const s = summarize(r.payload)
    report.s1 = s
    report.s3 = { exams: 0, examReasons: s.examReasons, netGapAllOne: true }
    expect(r.coached).toBe(false)
    expect(s.blockTypes.konu_calisma).toBeGreaterThan(0)
    expect(s.examReasons).toBe(0)
    const ap = await applyRoadmap(admin, A, A)
    expect(ap.error).toBeUndefined()
    await syncRoadmapProgress(admin, A)
    const { data: rows } = await admin.from("topic_assignments").select("status").eq("student_id", A).eq("origin", "upplan")
    const by: Record<string, number> = {}
    for (const x of rows ?? []) by[x.status] = (by[x.status] ?? 0) + 1
    report.s1_applied = by
    expect(by.aktif).toBe(r.payload.activeSlots)
    // Öğrenci görünümü (RLS'li oturum)
    const v = await loadRoadmapView(a, A)
    report.s1_view = { status: v.status, rows: v.rows.length, timelineMonths: v.timeline.length, aktif: v.rows.filter((x) => x.status === "aktif").length }
    expect(v.status).toBe("onaylandi")
  })

  it("S5 sıra değiştirme + ön koşul uyarısı + hedef/çıkar/geri al", { timeout: 120000 }, async () => {
    const v = await loadRoadmapView(a, A)
    const queue = v.rows.filter((x) => x.status === "sirada")
    const pos = new Map(queue.map((q, i) => [q.topic_id, i]))
    const edge = v.edges.find((e) => pos.has(e.prereq) && pos.has(e.topic) && pos.get(e.prereq)! < pos.get(e.topic)!)
    expect(edge).toBeTruthy()
    // Bağımlı konuyu ön koşulunun önüne al (setQueueOrder ile aynı: plan_order slotlarını yeniden dağıt).
    const ids = queue.map((q) => q.id)
    const dep = queue.find((q) => q.topic_id === edge!.topic)!
    const pre = queue.find((q) => q.topic_id === edge!.prereq)!
    const next = ids.filter((x) => x !== dep.id)
    next.splice(next.indexOf(pre.id), 0, dep.id)
    const slots = queue.map((q) => q.plan_order ?? 0).sort((x, y) => x - y)
    const t0 = Date.now()
    const { error: oe } = await a.rpc("upplan_set_plan_orders", { p_student_id: A, p_ids: next, p_orders: next.map((_, i) => slots[i]) })
    if (oe) throw oe
    await redateQueue(admin, A)
    report.s5_ms = Date.now() - t0
    const v2 = await loadRoadmapView(a, A)
    const topicOrder = [...v2.rows.filter((x) => x.status === "aktif" || x.status === "tamamlandi").map((x) => x.topic_id), ...v2.rows.filter((x) => x.status === "sirada").map((x) => x.topic_id)]
    const viol = prereqViolations(topicOrder, v2.edges)
    report.s5 = { movedTopic: dep.topic_name, prereq: pre.topic_name, violations: viol.length }
    expect(viol.some((x) => x.topic === edge!.topic && x.prereq === edge!.prereq)).toBe(true)
    // Hedef soru değişikliği + çıkar + geri al (öğrenci oturumu; updateRoadmapTarget /
    // setRoadmapItemRemoved ile aynı: her adımdan sonra senkron + kuyruk yeniden tarihlenir).
    const { data: last } = await a.from("topic_assignments").select("plan_order").eq("student_id", A).eq("origin", "upplan")
      .order("plan_order", { ascending: false, nullsFirst: false }).limit(1).single()
    const { error: e1 } = await a.from("topic_assignments").update({ hedef_soru: 60 }).eq("id", dep.id)
    await redateQueue(admin, A)
    const { error: e2 } = await a.from("topic_assignments").update({ status: "iptal" }).eq("id", pre.id)
    await syncRoadmapProgress(admin, A)
    await redateQueue(admin, A)
    const { error: e3 } = await a.from("topic_assignments").update({ status: "sirada", plan_order: (last?.plan_order ?? 0) + 1 }).eq("id", pre.id)
    await syncRoadmapProgress(admin, A)
    await redateQueue(admin, A)
    expect([e1, e2, e3]).toEqual([null, null, null])
    const { data: back } = await a.from("topic_assignments").select("status, hedef_soru").in("id", [dep.id, pre.id])
    report.s5_edit = back
  })

  it("Soru kaydıyla hedef ilerler, tamamlanınca sıradaki konu açılır", { timeout: 120000 }, async () => {
    const goals = (await loadAssignmentsWithProgress(a, { studentId: A })).filter((g) => g.status === "aktif" && g.created_by_role === "ai")
    const g = goals[0]
    const { data: t } = await a.from("topics").select("subject_id").eq("id", g.topic_id).single()
    const before = await admin.from("topic_assignments").select("id").eq("student_id", A).eq("status", "aktif")
    const { error } = await a.from("study_sessions").insert({
      student_id: A, created_by: A, subject_id: t!.subject_id, topic_id: g.topic_id, date: TODAY,
      total_questions: g.hedef_soru ?? 120, correct: g.hedef_soru ?? 120, wrong: 0, empty: 0, duration_minutes: Math.round((g.hedef_soru ?? 120) * 1.5),
    })
    if (error) throw error
    const after1 = (await loadAssignmentsWithProgress(a, { studentId: A })).find((x) => x.id === g.id)!
    const { data: m } = await admin.rpc("student_mastery_map", { p_student_id: A })
    const eff = m?.find((x) => x.topic_id === g.topic_id)?.effective
    const events = await syncRoadmapProgress(admin, A)
    const { data: st } = await admin.from("topic_assignments").select("status").eq("id", g.id).single()
    const afterActive = await admin.from("topic_assignments").select("id").eq("student_id", A).eq("status", "aktif")
    report.progress = { topic: g.topic_name, solved: after1.cozulen_soru, target: g.hedef_soru, effective: eff, status: st?.status, events, activeBefore: before.data?.length, activeAfter: afterActive.data?.length }
    expect(st?.status).toBe("tamamlandi")
    expect(events.some((e) => e.kind !== "tamamlandi")).toBe(true)
  })

  it("Program üretimi ve onayı, Bugün ekranı", { timeout: 120000 }, async () => {
    const d = await generateProgramDraft(admin, A, WEEK)
    if ("error" in d) throw new Error(d.error)
    const ap = await applyProgramDraft(admin, admin, A, WEEK, A)
    expect(ap.error).toBeUndefined()
    const { data: prog } = await a.from("weekly_programs").select("weekly_program_items(created_by_role, assignment_id, block_type, day_of_week)").eq("student_id", A).eq("week_start", WEEK).single()
    const items = prog?.weekly_program_items ?? []
    const today = await loadToday(a, A)
    const dow = ((new Date(`${TODAY}T12:00:00`).getDay() + 6) % 7) + 1
    report.program = {
      draftItems: d.items.length, meta: d.meta, written: ap.count,
      ai: items.filter((i) => i.created_by_role === "ai").length,
      linked: items.filter((i) => i.assignment_id).length,
      exams: items.filter((i) => i.block_type === "deneme").length,
      todayItems: today.items.length, todayDow: dow, todayItemsInProgram: items.filter((i) => i.day_of_week === dow).length,
    }
    expect(ap.count).toBeGreaterThan(0)
    expect(today.items.length).toBe(items.filter((i) => i.day_of_week === dow).length)
  })

  it("S6 koçlu öğrenci → koça öneri, koç seçerek kabul eder", { timeout: 120000 }, async () => {
    await setProfile(b, B, AVAIL_NORMAL)
    await scan(b, B, (g) => ((g ?? 0) >= 11 ? "hic_gormedim" : "eksik"))
    const r = await generateRoadmapDraft(admin, B)
    if ("error" in r) throw new Error(r.error)
    const { data: rm } = await admin.from("upplan_roadmaps").select("status").eq("student_id", B).single()
    const blocked = await applyRoadmap(admin, B, B)
    // Koç: öneriyi okur (RLS) ve ilk 3 konuyu kendi ataması olarak ekler (acceptRoadmapSuggestions ile aynı).
    const { data: seen } = await k.from("upplan_roadmaps").select("payload").eq("student_id", B).single()
    const items = parsePayload(seen!.payload)!.items.filter((i) => i.status === "aktif").slice(0, 3)
    const { error } = await k.from("topic_assignments").insert(items.map((i) => ({
      coach_id: K, student_id: B, topic_id: i.topic_id, hedef_soru: i.target_questions, hedef_dogruluk: i.target_accuracy,
      baslangic_tarihi: i.start, son_tarih: i.end, status: "aktif" as const, created_by: K, block_type: i.block_type, plan_order: i.plan_order, wave: i.wave, origin: "upplan",
    })))
    if (error) throw error
    const { data: owned } = await admin.from("topic_assignments").select("created_by_role, coach_id").eq("student_id", B)
    // Program önerisi → koç seçtiği kalemleri ekler
    const d = await generateProgramDraft(admin, B, WEEK)
    if ("error" in d) throw new Error(d.error)
    const pick = d.items.map((_, i) => i).filter((i) => i % 2 === 0)
    const ap = await applyProgramDraft(admin, k, B, WEEK, K, pick)
    const { data: prog } = await admin.from("weekly_programs").select("weekly_program_items(created_by_role)").eq("student_id", B).eq("week_start", WEEK).single()
    const coachView = await loadAssignmentsWithProgress(k, { studentId: B, coachScopeId: K })
    report.s6 = {
      roadmapStatus: rm?.status, studentApplyBlocked: blocked.error ?? null, coachSawItems: items.length,
      assignments: owned, programDraft: { coached: d.coached, items: d.items.length, picked: pick.length, written: ap.count, roles: prog?.weekly_program_items?.map((x) => x.created_by_role) },
      coachScopeRows: coachView.length,
    }
    expect(rm?.status).toBe("koca_onerildi")
    expect(blocked.error).toBeTruthy()
    expect((owned ?? []).every((o) => o.created_by_role === "coach" && o.coach_id === K)).toBe(true)
    expect(ap.count).toBe(pick.length)
  })

  it("S7 haftalık güncelleme (cron) — geride kalan hedef", { timeout: 300000 }, async () => {
    // Bir aktif UpPlan hedefini geride bırak: 20 gün önce başlamış, 2 gün sonra bitiyor, ilerleme 0.
    const goals = (await loadAssignmentsWithProgress(admin, { studentId: A })).filter((g) => g.status === "aktif" && g.created_by_role === "ai" && g.cozulen_soru === 0)
    const g = goals[0]
    const oldEnd = addDaysIso(TODAY, 2)
    await admin.from("topic_assignments").update({ baslangic_tarihi: addDaysIso(TODAY, -20), son_tarih: oldEnd }).eq("id", g.id)
    const queueBefore = await admin.from("topic_assignments").select("id, son_tarih").eq("student_id", A).eq("status", "sirada").order("plan_order").limit(1).single()
    const { data: lfBefore } = await admin.from("student_upplan_profile").select("load_factor").eq("student_id", A).single()

    const res = await fetch(`http://localhost:3100/api/cron/upplan-weekly?student=${A}&student=${B}`, { headers: { authorization: "Bearer e2e-upplan-secret" } })
    const body = await res.json()
    const unauthorized = (await fetch("http://localhost:3100/api/cron/upplan-weekly")).status

    const { data: after } = await admin.from("topic_assignments").select("son_tarih").eq("id", g.id).single()
    const queueAfter = await admin.from("topic_assignments").select("son_tarih").eq("id", queueBefore.data!.id).single()
    const { data: lfAfter } = await admin.from("student_upplan_profile").select("load_factor, last_weekly_run_at").eq("student_id", A).single()
    const { data: notes } = await admin.from("upplan_notifications").select("kind, message").eq("student_id", A)
    const { data: nextDraft } = await admin.from("upplan_program_drafts").select("status, items").eq("student_id", A).eq("week_start", addDaysIso(WEEK, 7)).maybeSingle()
    const { data: notesB } = await admin.from("upplan_notifications").select("kind, message").eq("student_id", B)
    const today = await loadToday(a, A)
    report.s7 = {
      http: res.status, body, unauthorized, behindTopic: g.topic_name, oldEnd, newEnd: after?.son_tarih,
      queueEndBefore: queueBefore.data?.son_tarih, queueEndAfter: queueAfter.data?.son_tarih,
      loadFactor: { before: lfBefore?.load_factor, after: lfAfter?.load_factor }, notifications: notes, coachedNotifications: notesB,
      nextWeekDraft: nextDraft ? { status: nextDraft.status, items: Array.isArray(nextDraft.items) ? nextDraft.items.length : 0 } : null,
      todayCards: { notices: today.notices.length, pendingDraftWeek: today.pendingDraftWeek },
    }
    expect(res.status).toBe(200)
    expect(unauthorized).toBe(401)
    expect(after!.son_tarih > oldEnd).toBe(true)
    expect(nextDraft?.status).toBe("taslak")
  })

  it("rapor", () => {
    writeFileSync(process.env.E2E_REPORT ?? "e2e-report.json", JSON.stringify(report, null, 2))
  })
})
