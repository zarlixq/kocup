// Bilgi atomu import'u — idempotent (upsert by id).
//
// Kullanım:
//   node scripts/import-knowledge-atoms.mjs                    # DRY-RUN (varsayılan, DB'ye yazmaz)
//   node scripts/import-knowledge-atoms.mjs --apply            # yazar
//   node scripts/import-knowledge-atoms.mjs --dir yol/klasor   # varsayılan: seed/knowledge_atoms
//   node scripts/import-knowledge-atoms.mjs --report rapor.json
//
// - DB'de olmayan konu_id'ler atlanır ve raporlanır; konular eklenince tekrar çalıştır.
// - related_atom_ids → knowledge_atom_prerequisites. Henüz var olmayan ön koşullar ertelenir
//   (sonraki çalıştırmada yazılır). --apply, bu batch'teki atomların ön koşul kümesini
//   JSON'a eşitler (JSON'dan çıkarılan ön koşul silinir — yalnız bu atomlar için).
// - Service role .env.local'dan okunur; yazma policy'si olmayan tablolara yalnız o yazabilir.
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { serviceClient } from "./lib/env.mjs"
import { atomKey, planImport, recordsFromJson } from "./lib/atoms-import.mjs"

const args = process.argv.slice(2)
const apply = args.includes("--apply")
const dir = args.includes("--dir") ? args[args.indexOf("--dir") + 1] : join("seed", "knowledge_atoms")
const reportPath = args.includes("--report") ? args[args.indexOf("--report") + 1] : null
const CHUNK = 200

if (!existsSync(dir)) {
  console.error(`Klasör bulunamadı: ${dir}`)
  process.exit(1)
}

const files = readdirSync(dir).filter((f) => f.endsWith(".json") && !f.startsWith("_"))
const input = []
for (const f of files) {
  try {
    for (const record of recordsFromJson(JSON.parse(readFileSync(join(dir, f), "utf8")))) input.push({ file: f, record })
  } catch (e) {
    console.error(`JSON okunamadı: ${f} — ${e.message}`)
    process.exit(1)
  }
}

const supabase = await serviceClient()

function chunks(arr, n) {
  const out = []
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
  return out
}

// DB'deki konular (yalnız dosyalarda geçenler) ve atomlar.
const topicIds = [...new Set(input.map((i) => i.record?.konu_id).filter(Boolean))]
const topics = new Map()
for (const part of chunks(topicIds, CHUNK)) {
  const { data, error } = await supabase.from("topics").select("id, name").in("id", part)
  if (error) throw new Error(`topics: ${error.message}`)
  for (const t of data) topics.set(t.id, { name: t.name })
}
const existingAtoms = new Map()
for (const part of chunks([...topics.keys()], CHUNK)) {
  const { data, error } = await supabase.from("knowledge_atoms").select("id, topic_id, name").in("topic_id", part)
  if (error) throw new Error(`knowledge_atoms: ${error.message}`)
  for (const a of data) existingAtoms.set(atomKey(a.topic_id, a.name), a)
}
// Ön koşul olarak başka konulardaki mevcut atomlar da geçerli.
const relatedIds = [...new Set(input.flatMap((i) => i.record?.related_atom_ids ?? []))]
for (const part of chunks(relatedIds, CHUNK)) {
  const { data } = await supabase.from("knowledge_atoms").select("id, topic_id, name").in("id", part)
  for (const a of data ?? []) existingAtoms.set(atomKey(a.topic_id, a.name), a)
}

const plan = planImport(input, { topics, existingAtoms })
const existingIds = new Set([...existingAtoms.values()].map((a) => a.id))
const report = {
  mode: apply ? "apply" : "dry-run",
  dir,
  files: files.length,
  records: input.length,
  atoms: {
    toWrite: plan.atoms.length,
    new: plan.atoms.filter((a) => !existingIds.has(a.id)).length,
    update: plan.atoms.filter((a) => existingIds.has(a.id)).length,
  },
  prerequisites: { toWrite: plan.prerequisites.length, deferred: plan.deferredPrerequisites.length },
  missingTopics: plan.missingTopics,
  skipped: plan.skipped,
  warnings: plan.warnings,
  deferredPrerequisites: plan.deferredPrerequisites,
}

console.log(`\n${apply ? "UYGULA" : "DRY-RUN"} — ${dir} (${files.length} dosya, ${input.length} kayıt)`)
console.table({
  "Yazılacak atom": report.atoms.toWrite,
  "  yeni": report.atoms.new,
  "  güncelleme": report.atoms.update,
  "Ön koşul (yazılacak)": report.prerequisites.toWrite,
  "Ön koşul (ertelendi)": report.prerequisites.deferred,
  "DB'de olmayan konu": plan.missingTopics.length,
  "Atlanan kayıt": plan.skipped.length,
  Uyarı: plan.warnings.length,
})
if (plan.missingTopics.length) {
  console.log("\nDB'de olmayan konu_id'ler (atlandı, konular eklenince tekrar çalıştır):")
  console.table(plan.missingTopics)
}
if (plan.skipped.length) {
  console.log("\nAtlanan kayıtlar:")
  console.table(plan.skipped)
}
if (plan.warnings.length) {
  console.log("\nUyarılar:")
  console.table(plan.warnings)
}
if (reportPath) writeFileSync(reportPath, JSON.stringify(report, null, 2))

if (!apply) {
  console.log("\nDry-run: DB'ye hiçbir şey yazılmadı. Uygulamak için --apply ekle.")
  process.exit(0)
}

for (const part of chunks(plan.atoms, CHUNK)) {
  const { error } = await supabase.from("knowledge_atoms").upsert(part, { onConflict: "id" })
  if (error) throw new Error(`knowledge_atoms upsert: ${error.message}`)
}
// Ön koşul senkronu: bu batch'in atomları için JSON'daki küme esas.
const batchIds = plan.atoms.map((a) => a.id)
for (const part of chunks(batchIds, CHUNK)) {
  const keep = plan.prerequisites.filter((p) => part.includes(p.atom_id))
  const { data: current, error } = await supabase
    .from("knowledge_atom_prerequisites")
    .select("atom_id, prerequisite_atom_id")
    .in("atom_id", part)
  if (error) throw new Error(`prerequisites select: ${error.message}`)
  const wanted = new Set(keep.map((p) => `${p.atom_id}|${p.prerequisite_atom_id}`))
  // Ertelenen (henüz var olmayan) ön koşullar silinmez; yalnız JSON'dan tamamen çıkanlar silinir.
  const deferredSet = new Set(plan.deferredPrerequisites.map((p) => `${p.atom_id}|${p.prerequisite_atom_id}`))
  const stale = current.filter((c) => !wanted.has(`${c.atom_id}|${c.prerequisite_atom_id}`) && !deferredSet.has(`${c.atom_id}|${c.prerequisite_atom_id}`))
  for (const s of stale) {
    const { error: delErr } = await supabase
      .from("knowledge_atom_prerequisites")
      .delete()
      .eq("atom_id", s.atom_id)
      .eq("prerequisite_atom_id", s.prerequisite_atom_id)
    if (delErr) throw new Error(`prerequisites delete: ${delErr.message}`)
  }
  if (keep.length) {
    const { error: insErr } = await supabase
      .from("knowledge_atom_prerequisites")
      .upsert(keep, { onConflict: "atom_id,prerequisite_atom_id", ignoreDuplicates: true })
    if (insErr) throw new Error(`prerequisites upsert: ${insErr.message}`)
  }
}
console.log(`\nTamam: ${plan.atoms.length} atom, ${plan.prerequisites.length} ön koşul yazıldı.`)
