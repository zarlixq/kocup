"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

function s(v: FormDataEntryValue | null) {
  const str = String(v ?? "").trim()
  return str === "" ? null : str
}

export async function updateProfileAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Oturum bulunamadı." }

  const full_name = s(formData.get("full_name"))
  if (!full_name) return { error: "Ad soyad zorunlu." }

  const { error } = await supabase
    .from("profiles")
    .update({ full_name, phone: s(formData.get("phone")) })
    .eq("id", user.id)

  if (error) return { error: error.message }
  revalidatePath("/koc/ayarlar")
  revalidatePath("/koc")
  return { ok: true }
}

export async function updatePasswordAction(formData: FormData) {
  const password = String(formData.get("password") ?? "")
  if (password.length < 6) return { error: "Şifre en az 6 karakter olmalı." }
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { error: error.message }
  return { ok: true }
}
