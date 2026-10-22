// Video takip tablolarının salt-okuma JSON yedeği + satır sayımı.
// Kullanım: node scripts/backup-video-tables.mjs <klasör>
import { mkdirSync, writeFileSync } from "node:fs"
import { serviceClient } from "./lib/env.mjs"

const dir = process.argv[2]
if (!dir) throw new Error("Klasör ver: node scripts/backup-video-tables.mjs backups/YYYY-MM-DD")
mkdirSync(dir, { recursive: true })
const supabase = await serviceClient()
const counts = {}
for (const table of [
  "student_resource_playlists",
  "student_resource_videos",
  "weekly_program_items",
  "user_ui_preferences",
  "topic_assignments",
  "upplan_roadmaps",
  "upplan_program_drafts",
]) {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select("*").range(from, from + 999)
    if (error) throw error
    rows.push(...data)
    if (data.length < 1000) break
  }
  writeFileSync(`${dir}/${table}.json`, JSON.stringify(rows))
  counts[table] = rows.length
}
console.log(JSON.stringify({ takenAt: new Date().toISOString(), counts }))
