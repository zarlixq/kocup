import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"

type Client = SupabaseClient<Database>

export type ActiveTopic = { id: string; subject_id: string; name: string; order: number | null }

// Konu SEÇİCİLERİ için tek kaynak: yalnızca topics.is_active = true.
// - Kolon yoksa (eski şema; Postgres 42703 "undefined column") filtresiz tekrar
//   dener → kolon eklenmeden önce de, sonra da deploy/flag gerektirmeden çalışır.
// - includeIds: düzenlenen kaydın mevcut konusu pasif olsa bile listede kalsın.
// Müdürün müfredat yönetimi ve geçmiş kayıt gösterimleri bu helper'ı KULLANMAZ.
let columnMissing = false
const PAGE = 1000

function isUndefinedColumn(err: { code?: string; message?: string } | null) {
  return !!err && (err.code === "42703" || /is_active/.test(err.message ?? ""))
}

export async function fetchActiveTopics(
  supabase: Client,
  opts: { subjectId?: string; includeIds?: (string | null | undefined)[] } = {},
): Promise<ActiveTopic[]> {
  let rows: ActiveTopic[] = []

  // PostgREST bir istekte en fazla PAGE satır döner (konu sayısı bunu aşabilir): sayfalı oku.
  for (let from = 0; ; from += PAGE) {
    let q = supabase.from("topics").select("id, subject_id, name, order")
    if (!columnMissing) q = q.eq("is_active", true)
    if (opts.subjectId) q = q.eq("subject_id", opts.subjectId)
    const { data, error } = await q.order("order").order("id").range(from, from + PAGE - 1)
    if (error && !columnMissing && isUndefinedColumn(error)) {
      columnMissing = true
      rows = []
      from = -PAGE
      continue
    }
    if (error) {
      console.error("fetchActiveTopics", error)
      break
    }
    rows.push(...(data ?? []))
    if ((data ?? []).length < PAGE) break
  }

  const extra = (opts.includeIds ?? []).filter((v): v is string => !!v && !rows.some((r) => r.id === v))
  if (extra.length > 0) {
    const { data } = await supabase.from("topics").select("id, subject_id, name, order").in("id", extra)
    rows = [...rows, ...(data ?? [])]
  }
  return rows
}

/** Bir dersteki aktif konu sayısı (soru kaydında "konu zorunlu mu?" kararı için). */
export async function countActiveTopics(supabase: Client, subjectId: string): Promise<number> {
  return (await fetchActiveTopics(supabase, { subjectId })).length
}
