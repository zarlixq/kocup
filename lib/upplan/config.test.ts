import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { UPPLAN_SQL_CONFIG, UPPLAN_TRACK_SQL_CONFIG } from "@/lib/upplan/config"

// config.ts ↔ upplan_config senkronu: migration'lardaki seed / update
// satırlarını sırayla uygular ve son değerleri config.ts ile karşılaştırır.
const MIGRATIONS = join(process.cwd(), "supabase", "migrations")

function sqlConfigValues(): Record<string, number> {
  const out: Record<string, number> = {}
  const files = readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith(".sql"))
    .sort()
  for (const f of files) {
    const sql = readFileSync(join(MIGRATIONS, f), "utf8")
    const seed = sql.match(/insert into public\.upplan_config[\s\S]*?;/gi) ?? []
    for (const block of seed) {
      for (const m of block.matchAll(/\('([a-z0-9_]+)',\s*(-?[\d.]+)/g)) out[m[1]] = Number(m[2])
    }
    for (const m of sql.matchAll(/update public\.upplan_config set value = (-?[\d.]+) where key = '([a-z0-9_]+)'/gi)) {
      out[m[2]] = Number(m[1])
    }
  }
  return out
}

describe("upplan_config senkronu", () => {
  it("migration seed'leri config.ts ile birebir", () => {
    expect(sqlConfigValues()).toEqual({ ...UPPLAN_SQL_CONFIG, ...UPPLAN_TRACK_SQL_CONFIG })
  })
})
