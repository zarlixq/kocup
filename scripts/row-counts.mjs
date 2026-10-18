// Tam satır sayımı (salt okuma). Migration öncesi/sonrası karşılaştırma için.
// Kullanım: node scripts/row-counts.mjs [önceki-sayim.json]
//   önceki dosya verilirse azalan tablolar işaretlenir ve çıkış kodu 1 olur.
import { existsSync, readFileSync } from "node:fs"
import { serviceClient } from "./lib/env.mjs"
import { BACKUP_TABLES } from "./backup-tables-list.mjs"

const EXTRA = ["knowledge_atoms", "knowledge_atom_prerequisites", "wrong_answers"]
const supabase = await serviceClient()
const counts = {}
for (const table of [...BACKUP_TABLES, ...EXTRA]) {
  const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true })
  counts[table] = error ? `yok (${error.code ?? error.message})` : count
}

const prevFile = process.argv[2]
let decreased = []
if (prevFile && existsSync(prevFile)) {
  const raw = JSON.parse(readFileSync(prevFile, "utf8"))
  const prev = raw.counts ?? raw
  decreased = Object.keys(prev).filter(
    (t) => typeof prev[t] === "number" && typeof counts[t] === "number" && counts[t] < prev[t],
  )
  console.table(Object.fromEntries(Object.keys(counts).map((t) => [t, { once: prev[t] ?? "-", simdi: counts[t] }])))
} else {
  console.table(counts)
}
console.log(JSON.stringify({ takenAt: new Date().toISOString(), counts }))
if (decreased.length) {
  console.error("AZALAN TABLOLAR:", decreased.join(", "))
  process.exit(1)
}
