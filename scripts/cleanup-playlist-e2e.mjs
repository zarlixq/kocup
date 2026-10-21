// Playlist uçtan uca test hesabını ve ona ait TÜM satırları siler.
// Yalnız test-playlist@kocupakademi.com; gerçek kullanıcı satırına dokunmaz.
// youtube_playlist_cache yalnız --cache ile temizlenir (paylaşılan önbellek).
// Kullanım: node scripts/cleanup-playlist-e2e.mjs [--dry] [--cache]
// Önce sayar, siler, sonra tekrar sayar (gerçek veri kontrol sayılarıyla).
import { serviceClient } from "./lib/env.mjs"

const EMAIL = "test-playlist@kocupakademi.com"
const dry = process.argv.includes("--dry")
const cache = process.argv.includes("--cache")
const db = await serviceClient()

const { data: list, error: le } = await db.auth.admin.listUsers({ perPage: 1000 })
if (le) throw le
const users = list.users.filter((u) => u.email === EMAIL)
if (users.length > 1) throw new Error("Beklenmeyen hesap sayısı")
const id = users[0]?.id

async function count(table, col, value) {
  let q = db.from(table).select("*", { count: "exact", head: true })
  if (col) q = q.eq(col, value)
  const { count: n, error } = await q
  if (error) throw error
  return n
}

// [tablo, kolon] — silme sırası (çocuk → ebeveyn)
const plan = [
  ["student_resource_videos", "student_id"],
  ["student_resource_playlists", "student_id"],
  ["user_ui_preferences", "user_id"],
  ["student_upplan_profile", "student_id"],
  ["students", "id"],
  ["profiles", "id"],
]
const control = ["student_resource_playlists", "student_resource_videos", "user_ui_preferences", "profiles", "students"]
const before = Object.fromEntries(await Promise.all(control.map(async (t) => [t, await count(t)])))
console.log("Toplam (önce):", before)

if (id) {
  for (const [t, c] of plan) console.log(`${t}: ${await count(t, c, id)} test satırı`)
}
if (cache) console.log(`youtube_playlist_cache: ${await count("youtube_playlist_cache")} satır`)
if (dry) process.exit(0)

if (id) {
  for (const [t, c] of plan) {
    const { error } = await db.from(t).delete().eq(c, id)
    if (error) throw error
  }
  // profiles silinince auth kullanıcısı da gidebilir (tetikleyici) → 404 sorun değil.
  const { error } = await db.auth.admin.deleteUser(id)
  if (error && error.status !== 404) throw error
}
if (cache) {
  const { error } = await db.from("youtube_playlist_cache").delete().neq("youtube_playlist_id", "")
  if (error) throw error
}

const after = Object.fromEntries(await Promise.all(control.map(async (t) => [t, await count(t)])))
console.log("Toplam (sonra):", after)
if (id) for (const [t, c] of plan) console.log(`${t}: ${await count(t, c, id)} test satırı kaldı`)
