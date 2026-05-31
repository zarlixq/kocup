"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

function s(v: FormDataEntryValue | null) {
  const str = String(v ?? "").trim()
  return str === "" ? null : str
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: "Oturum bulunamadı." }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()
  if (profile?.role !== "admin") return { ok: false as const, error: "Yetkisiz işlem." }
  return { ok: true as const, supabase, userId: user.id }
}

export async function updateProfileAction(formData: FormData) {
  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error }

  const full_name = s(formData.get("full_name"))
  if (!full_name) return { error: "Ad soyad zorunlu." }

  const { error } = await auth.supabase
    .from("profiles")
    .update({ full_name, phone: s(formData.get("phone")) })
    .eq("id", auth.userId)

  if (error) return { error: error.message }
  revalidatePath("/mudur/ayarlar")
  revalidatePath("/mudur/profilim")
  revalidatePath("/mudur")
  return { ok: true }
}

export async function updatePasswordAction(formData: FormData) {
  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error }

  const password = String(formData.get("password") ?? "")
  if (password.length < 6) return { error: "Şifre en az 6 karakter olmalı." }

  const { error } = await auth.supabase.auth.updateUser({ password })
  if (error) return { error: error.message }
  return { ok: true }
}
