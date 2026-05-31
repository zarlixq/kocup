"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

type Result = { ok?: true; error?: string }

async function requireStudent() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: "Oturum bulunamadı." }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()
  if (profile?.role !== "student") return { ok: false as const, error: "Yetkisiz işlem." }
  return { ok: true as const, supabase, userId: user.id, userEmail: user.email ?? "" }
}

// Öğrenci sadece TELEFON güncelleyebilir.
// Ad-soyad, email, sınıf, hedef, koç bilgisi — hepsi readonly.
const phoneSchema = z.object({
  phone: z
    .string()
    .trim()
    .max(20)
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
})

export async function updateOgrenciProfileAction(formData: FormData): Promise<Result> {
  const auth = await requireStudent()
  if (!auth.ok) return { error: auth.error }

  const parsed = phoneSchema.safeParse({ phone: formData.get("phone") })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz telefon." }
  }

  const { error } = await auth.supabase
    .from("profiles")
    .update({ phone: parsed.data.phone })
    .eq("id", auth.userId)

  if (error) return { error: error.message }

  revalidatePath("/ogrenci/profilim")
  revalidatePath("/ogrenci/ayarlar")
  return { ok: true }
}

const passwordSchema = z.object({
  currentPassword: z.string().min(6, "Mevcut şifren en az 6 karakter olmalı."),
  newPassword: z.string().min(8, "Yeni şifre en az 8 karakter olmalı."),
})

export async function updateOgrenciPasswordAction(formData: FormData): Promise<Result> {
  const auth = await requireStudent()
  if (!auth.ok) return { error: auth.error }

  const parsed = passwordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Form hatalı." }
  }

  // Mevcut şifreyi reauthenticate et — yanlışsa şifre değişmesin.
  const { error: signErr } = await auth.supabase.auth.signInWithPassword({
    email: auth.userEmail,
    password: parsed.data.currentPassword,
  })
  if (signErr) {
    return { error: "Mevcut şifren yanlış." }
  }

  const { error } = await auth.supabase.auth.updateUser({
    password: parsed.data.newPassword,
  })
  if (error) return { error: error.message }

  return { ok: true }
}

// Bildirim tercihleri — anahtar listesi sabit, başka key kaydedilmesin.
const NOTIFICATION_KEYS = [
  "mesaj_kocum",
  "yeni_konu",
  "randevu_hatirlat",
  "haftalik_ozet",
] as const

type NotificationKey = (typeof NOTIFICATION_KEYS)[number]

const notificationSchema = z.record(z.enum(NOTIFICATION_KEYS), z.boolean())

export async function updateOgrenciNotificationsAction(
  input: unknown,
): Promise<Result> {
  const auth = await requireStudent()
  if (!auth.ok) return { error: auth.error }

  const parsed = notificationSchema.safeParse(input)
  if (!parsed.success) {
    return { error: "Geçersiz tercih." }
  }

  // Yalnızca whitelist anahtarları sakla.
  const sanitized: Record<NotificationKey, boolean> = {} as Record<NotificationKey, boolean>
  for (const k of NOTIFICATION_KEYS) {
    if (k in parsed.data) sanitized[k] = parsed.data[k] === true
  }

  const { error } = await auth.supabase
    .from("profiles")
    .update({ notification_preferences: sanitized })
    .eq("id", auth.userId)

  if (error) return { error: error.message }

  revalidatePath("/ogrenci/ayarlar")
  return { ok: true }
}
