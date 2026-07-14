"use server"

import { createClient } from "@/lib/supabase/server"
import type { UiScope } from "@/lib/analytics/ui-preferences"

// ─────────────────────────────────────────────────────────────────────────
// user_ui_preferences — server okuma + kalıcı yazma (server action)
// RLS: kullanıcı yalnız kendi satırını görür/yazar (migration 190).
// ─────────────────────────────────────────────────────────────────────────

/**
 * Oturumdaki kullanıcının bir scope için ham ayarlarını döndürür (yoksa null).
 * Server Component'lerde çağrılır; UI tarafında merge* ile varsayılana tamamlanır.
 */
export async function getUiPreference(scope: UiScope): Promise<unknown | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from("user_ui_preferences")
    .select("settings")
    .eq("user_id", user.id)
    .eq("scope", scope)
    .maybeSingle()

  if (error) {
    console.error("getUiPreference hatası:", error)
    return null
  }
  return data?.settings ?? null
}

/**
 * Bir scope için ayarları kalıcı kaydeder (upsert). settings JSON-serializable olmalı.
 */
export async function saveUiPreference(
  scope: UiScope,
  settings: Record<string, unknown>,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Yetkisiz işlem." }

  const { error } = await supabase
    .from("user_ui_preferences")
    .upsert(
      { user_id: user.id, scope, settings: settings as never },
      { onConflict: "user_id,scope" },
    )

  if (error) {
    console.error("saveUiPreference hatası:", error)
    return { success: false, error: "Tercih kaydedilemedi." }
  }
  return { success: true }
}
