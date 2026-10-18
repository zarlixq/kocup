// Canlı DB'den önemli tabloların SALT OKUMA JSON yedeği.
// Kullanım: node scripts/backup-tables.mjs [hedef-klasör]
// Yalnızca SELECT yapar; çıktı klasörü .gitignore'dadır (kişisel veri içerir).
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { serviceClient } from "./lib/env.mjs"
import { BACKUP_TABLES } from "./backup-tables-list.mjs"


const PAGE = 1000
const outDir = process.argv[2] ?? join("backups", new Date().toISOString().slice(0, 10))
mkdirSync(outDir, { recursive: true })

const supabase = await serviceClient()
const summary = {}
for (const table of BACKUP_TABLES) {
  const rows = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from(table).select("*").order("id").range(from, from + PAGE - 1)
    if (error) throw new Error(`${table}: ${error.message}`)
    rows.push(...data)
    if (data.length < PAGE) break
  }
  writeFileSync(join(outDir, `${table}.json`), JSON.stringify(rows, null, 2))
  summary[table] = rows.length
}
writeFileSync(join(outDir, "_summary.json"), JSON.stringify({ takenAt: new Date().toISOString(), counts: summary }, null, 2))
console.table(summary)
