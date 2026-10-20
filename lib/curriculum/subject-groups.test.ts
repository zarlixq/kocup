import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { SUBJECT_GROUPS, groupSubjectNames } from "@/lib/curriculum/subject-groups"

// subject-groups.ts ↔ public.subject_groups senkronu: migration'lardaki
// (ders adı, grup) değer listelerini sırayla uygular ve config'le karşılaştırır.
const MIGRATIONS = join(process.cwd(), "supabase", "migrations")

function sqlGroups(): Record<string, string> {
  const out: Record<string, string> = {}
  const files = readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith(".sql"))
    .sort()
  for (const f of files) {
    const sql = readFileSync(join(MIGRATIONS, f), "utf8")
    for (const block of sql.match(/insert into public\.subject_groups[\s\S]*?;/gi) ?? []) {
      for (const m of block.matchAll(/\('([^']+)',\s*'([a-z_]+)'\)/g)) out[m[1]] = m[2]
    }
  }
  return out
}

describe("subject_groups senkronu", () => {
  it("migration'daki eşleme config ile birebir", () => {
    const fromConfig: Record<string, string> = {}
    for (const [key, names] of Object.entries(SUBJECT_GROUPS)) for (const n of names) fromConfig[n] = key
    expect(sqlGroups()).toEqual(fromConfig)
  })

  it("grupsuz ders yalnız kendisi", () => {
    expect(groupSubjectNames("AYT Matematik")).toContain("TYT Matematik")
    expect(groupSubjectNames("LGS Matematik")).toEqual(["LGS Matematik"])
  })
})
