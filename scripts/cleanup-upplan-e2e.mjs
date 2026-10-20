// UpPlan uçtan uca test hesaplarını ve onlara ait TÜM satırları siler.
// Yalnız aşağıdaki test e-postaları; gerçek kullanıcı satırına dokunmaz.
// Kullanım: node scripts/cleanup-upplan-e2e.mjs [--dry]
// Önce tablo tablo sayar, siler, sonra tekrar sayar (gerçek veri kontrol sayılarıyla).
import { serviceClient } from "./lib/env.mjs"

const EMAILS = [
  "test-upplan@kocupakademi.com",
  "test-upplan-koclu@kocupakademi.com",
  "test-upplan-koc@kocupakademi.com",
  "test-upplan-mezun@kocupakademi.com",
]
const dry = process.argv.includes("--dry")
const db = await serviceClient()

const { data: list, error: le } = await db.auth.admin.listUsers({ perPage: 1000 })
if (le) throw le
const ids = list.users.filter((u) => EMAILS.includes(u.email ?? "")).map((u) => u.id)
if (ids.length > EMAILS.length) throw new Error("Beklenmeyen hesap sayısı")
console.log(`Test hesabı: ${ids.length}`)
if (ids.length === 0) process.exit(0)

async function idsOf(table, col) {
  const { data, error } = await db.from(table).select("id").in(col, ids)
  if (error) throw error
  return data.map((r) => r.id)
}
const programIds = await idsOf("weekly_programs", "student_id")
const examIds = await idsOf("exams", "student_id")

// [tablo, kolon, değerler] — silme sırası (çocuk → ebeveyn)
const plan = [
  ["weekly_program_items", "program_id", programIds],
  ["weekly_programs", "student_id", ids],
  ["exam_results", "exam_id", examIds],
  ["wrong_answers", "student_id", ids],
  ["exams", "student_id", ids],
  ["study_sessions", "student_id", ids],
  ["topic_assignments", "student_id", ids],
  ["appointments", "student_id", ids],
  ["appointments", "coach_id", ids],
  ["coach_assignment_history", "student_id", ids],
  ["student_resource_videos", "student_id", ids],
  ["student_resource_playlists", "student_id", ids],
  ["upplan_notifications", "student_id", ids],
  ["upplan_program_drafts", "student_id", ids],
  ["upplan_roadmaps", "student_id", ids],
  ["student_topic_mastery", "student_id", ids],
  ["student_topic_self_assessment", "student_id", ids],
  ["student_upplan_profile", "student_id", ids],
  ["user_ui_preferences", "user_id", ids],
  ["students", "id", ids],
  ["profiles", "id", ids],
]
const CONTROL = ["topic_assignments", "study_sessions", "weekly_program_items", "weekly_programs", "profiles", "students", "student_upplan_profile"]

async function count(table, col, vals) {
  if (vals.length === 0) return 0
  const { count: n, error } = await db.from(table).select("*", { count: "exact", head: true }).in(col, vals)
  if (error) throw error
  return n ?? 0
}
async function total(table) {
  const { count: n, error } = await db.from(table).select("*", { count: "exact", head: true })
  if (error) throw error
  return n ?? 0
}
async function snapshot() {
  const rows = {}
  for (const [t, c, v] of plan) rows[`${t}.${c}`] = await count(t, c, v)
  const real = {}
  for (const t of CONTROL) real[t] = (await total(t)) - (rows[`${t}.${t === "weekly_program_items" ? "program_id" : t === "profiles" || t === "students" ? "id" : "student_id"}`] ?? 0)
  return { rows, real }
}

const before = await snapshot()
console.log("ÖNCE (test satırları):", before.rows)
console.log("ÖNCE (gerçek kontrol):", before.real)
if (dry) process.exit(0)

for (const [t, c, v] of plan) {
  if (v.length === 0) continue
  const { error } = await db.from(t).delete().in(c, v)
  if (error) throw new Error(`${t}: ${error.message}`)
}
// profiles silinince on_profile_deleted trigger'ı auth kullanıcısını da siler; kalan varsa burada.
for (const id of ids) {
  const { error } = await db.auth.admin.deleteUser(id)
  if (error && error.code !== "user_not_found") throw error
}

const after = await snapshot()
const left = list.users.length - (await db.auth.admin.listUsers({ perPage: 1000 })).data.users.length
console.log("SONRA (test satırları):", after.rows)
console.log("SONRA (gerçek kontrol):", after.real)
console.log(`Silinen auth kullanıcısı: ${left}`)
for (const t of CONTROL) if (after.real[t] !== before.real[t]) throw new Error(`Gerçek veri değişti: ${t} ${before.real[t]} → ${after.real[t]}`)
