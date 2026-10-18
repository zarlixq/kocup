// .env.local'ı (dotenv bağımlılığı olmadan) okur. Değerleri asla loglamayın.
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

export function loadEnv(file = ".env.local") {
  const text = readFileSync(resolve(process.cwd(), file), "utf8")
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!m || line.trim().startsWith("#")) continue
    let v = m[2]
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    if (!(m[1] in process.env)) process.env[m[1]] = v
  }
}

export async function serviceClient() {
  loadEnv()
  const { createClient } = await import("@supabase/supabase-js")
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY .env.local'da yok")
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}
