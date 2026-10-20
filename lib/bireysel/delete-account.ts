import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"

// Hesap silme — Storage dosyaları SQL ile silinemediği için önce Storage API ile
// temizlenir, ardından veritabanı tek transaction'lı delete_my_account() RPC'siyle
// (öğrencinin kendi oturumuyla) silinir. "use server" DEĞİL: action ve test çağırır.

type Client = SupabaseClient<Database>

/** Öğrenciye ait dosyaların bulunduğu bucket'lar ({bucket}/{user_id}/...). */
export const USER_STORAGE_BUCKETS = ["exam-pdfs", "feedback"] as const

export async function purgeUserStorage(admin: Client, userId: string): Promise<{ ok: boolean; removed: number }> {
  let removed = 0
  for (const bucket of USER_STORAGE_BUCKETS) {
    for (;;) {
      const { data, error } = await admin.storage.from(bucket).list(userId, { limit: 100 })
      if (error) {
        console.error(`purgeUserStorage list ${bucket}:`, error)
        return { ok: false, removed }
      }
      const files = (data ?? []).filter((f) => f.id !== null).map((f) => `${userId}/${f.name}`)
      if (files.length === 0) break
      const { error: rmErr } = await admin.storage.from(bucket).remove(files)
      if (rmErr) {
        console.error(`purgeUserStorage remove ${bucket}:`, rmErr)
        return { ok: false, removed }
      }
      removed += files.length
    }
  }
  return { ok: true, removed }
}

/** `session` öğrencinin kendi oturum client'ı olmalı (RPC auth.uid() kullanır). */
export async function deleteOwnAccount(
  admin: Client,
  session: Client,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string; code?: string }> {
  const storage = await purgeUserStorage(admin, userId)
  if (!storage.ok) return { ok: false, error: "Dosyaların silinemedi, tekrar deneyin." }

  const { error } = await session.rpc("delete_my_account")
  if (error) {
    console.error("delete_my_account:", error)
    return { ok: false, code: error.code, error: error.code === "P0001" ? error.message : "Hesabın silinemedi, tekrar deneyin." }
  }
  return { ok: true }
}
