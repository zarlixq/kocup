// Konu sınav ağırlıkları import'u — idempotent (upsert by topic_id + exam).
//
// Kullanım:
//   node scripts/import-topic-exam-weights.mjs                 # DRY-RUN (varsayılan, DB'ye yazmaz)
//   node scripts/import-topic-exam-weights.mjs --apply         # yazar
//   node scripts/import-topic-exam-weights.mjs --file yol.json # varsayılan: seed/topic_exam_weights.json
//
// Format: [{ "topic_id": "<uuid>", "exam": "tyt" | "ayt" | "lgs", "avg_questions": 1.5 }, ...]
// - Dosya yoksa hata vermeden çıkar (veri gelene kadar uygulama ders/konu tahminini kullanır).
// - DB'de olmayan / pasif konular ve geçersiz satırlar atlanır, raporlanır.
// - Hiçbir satır silinmez; JSON'da olmayan mevcut ağırlıklar olduğu gibi kalır.
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { serviceClient } from "./lib/env.mjs"

const args = process.argv.slice(2)
const apply = args.includes("--apply")
const file = args.includes("--file") ? args[args.indexOf("--file") + 1] : join("seed", "topic_exam_weights.json")
const EXAMS = new Set(["tyt", "ayt", "lgs"])
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const CHUNK = 500

if (!existsSync(file)) {
  console.log(`Ağırlık dosyası yok (${file}); yapılacak bir şey yok.`)
  process.exit(0)
}

let rows
try {
  rows = JSON.parse(readFileSync(file, "utf8"))
} catch (e) {
  console.error(`JSON okunamadı: ${file} — ${e.message}`)
  process.exit(1)
}
if (!Array.isArray(rows)) {
  console.error("Beklenen format: dizi [{ topic_id, exam, avg_questions }]")
  process.exit(1)
}

const invalid = []
const valid = new Map()
for (const [i, r] of rows.entries()) {
  const ok =
    r && typeof r === "object" && UUID.test(String(r.topic_id)) && EXAMS.has(r.exam) &&
    typeof r.avg_questions === "number" && Number.isFinite(r.avg_questions) && r.avg_questions >= 0
  if (!ok) invalid.push(i)
  else valid.set(`${r.topic_id}:${r.exam}`, { topic_id: r.topic_id, exam: r.exam, avg_questions: Math.round(r.avg_questions * 100) / 100 })
}

const supabase = await serviceClient()
const ids = [...new Set([...valid.values()].map((v) => v.topic_id))]
const known = new Map()
for (let i = 0; i < ids.length; i += CHUNK) {
  const { data, error } = await supabase.from("topics").select("id, is_active, subjects(exam_type)").in("id", ids.slice(i, i + CHUNK))
  if (error) {
    console.error("Konular okunamadı:", error.message)
    process.exit(1)
  }
  for (const t of data ?? []) known.set(t.id, t)
}

const missing = []
const inactive = []
const examMismatch = []
const toWrite = []
for (const v of valid.values()) {
  const t = known.get(v.topic_id)
  if (!t) missing.push(v.topic_id)
  else if (!t.is_active) inactive.push(v.topic_id)
  else {
    if (t.subjects?.exam_type && t.subjects.exam_type !== v.exam) examMismatch.push(`${v.topic_id} (${t.subjects.exam_type}≠${v.exam})`)
    toWrite.push(v)
  }
}

console.log({
  dosya: file,
  satir: rows.length,
  gecersiz: invalid.length,
  yazilacak: toWrite.length,
  dbdeYok: missing.length,
  pasifKonu: inactive.length,
  sinavUyumsuz: examMismatch.slice(0, 10),
  mod: apply ? "APPLY" : "DRY-RUN",
})
if (invalid.length) console.log("Geçersiz satır indeksleri:", invalid.slice(0, 20))

if (!apply) {
  console.log("DRY-RUN: DB'ye yazılmadı. Yazmak için --apply ekle.")
  process.exit(0)
}

for (let i = 0; i < toWrite.length; i += CHUNK) {
  const batch = toWrite.slice(i, i + CHUNK).map((v) => ({ ...v, updated_at: new Date().toISOString() }))
  const { error } = await supabase.from("topic_exam_weights").upsert(batch, { onConflict: "topic_id,exam" })
  if (error) {
    console.error("Yazma hatası:", error.message)
    process.exit(1)
  }
}
console.log(`${toWrite.length} ağırlık yazıldı.`)
