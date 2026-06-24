"use server"

import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

/**
 * Zorunlu ilk-giriş şifre değiştirme: yeni şifreyi set eder ve
 * must_change_password bayrağını kaldırır (öğrenci "aktif" olur).
 */
export async function completeForcedPasswordChange(
  newPassword: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Oturum bulunamadı." }
  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return { success: false, error: "Şifre en az 8 karakter olmalı." }
  }

  const { error: pwErr } = await supabase.auth.updateUser({ password: newPassword })
  if (pwErr) {
    return { success: false, error: "Şifre güncellenemedi, tekrar deneyin." }
  }

  // Bayrağı kaldır (sadece kendi satırı). first_login_at trigger ile zaten dolu.
  const { error: flagErr } = await supabaseAdmin()
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", user.id)
  if (flagErr) {
    console.error("must_change_password güncelleme hatası:", flagErr)
    return { success: false, error: "Profil güncellenemedi." }
  }

  return { success: true }
}
