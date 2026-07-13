"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { BASVURU_STATUS_VALUES, KURUM_STATUS_VALUES } from "@/lib/basvurular"

type ActionResult = { success: boolean; error?: string }

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: "Yetkisiz işlem." }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()
  if (profile?.role !== "admin") return { ok: false as const, error: "Yetkisiz işlem." }
  return { ok: true as const }
}

const idSchema = z.string().uuid("Kayıt bulunamadı.")

export async function updateKurumStatus(id: string, status: string): Promise<ActionResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, error: auth.error }

  const parsedId = idSchema.safeParse(id)
  const parsedStatus = z.enum(KURUM_STATUS_VALUES).safeParse(status)
  if (!parsedId.success || !parsedStatus.success) {
    return { success: false, error: "Geçersiz veri." }
  }

  const admin = supabaseAdmin()
  const { error } = await admin
    .from("institution_inquiries")
    .update({ status: parsedStatus.data })
    .eq("id", parsedId.data)

  if (error) {
    console.error("Kurum başvuru durum güncelleme hatası:", error)
    return { success: false, error: "Durum güncellenemedi." }
  }

  revalidatePath("/mudur/talepler")
  return { success: true }
}

export async function updateKocStatus(id: string, status: string): Promise<ActionResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, error: auth.error }

  const parsedId = idSchema.safeParse(id)
  const parsedStatus = z.enum(BASVURU_STATUS_VALUES).safeParse(status)
  if (!parsedId.success || !parsedStatus.success) {
    return { success: false, error: "Geçersiz veri." }
  }

  const admin = supabaseAdmin()
  const { error } = await admin
    .from("koc_applications")
    .update({ status: parsedStatus.data })
    .eq("id", parsedId.data)

  if (error) {
    console.error("Koç başvuru durum güncelleme hatası:", error)
    return { success: false, error: "Durum güncellenemedi." }
  }

  revalidatePath("/mudur/talepler")
  return { success: true }
}

export async function updateOgrenciStatus(id: string, status: string): Promise<ActionResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, error: auth.error }

  const parsedId = idSchema.safeParse(id)
  const parsedStatus = z.enum(BASVURU_STATUS_VALUES).safeParse(status)
  if (!parsedId.success || !parsedStatus.success) {
    return { success: false, error: "Geçersiz veri." }
  }

  const admin = supabaseAdmin()
  const { error } = await admin
    .from("ogrenci_applications")
    .update({ status: parsedStatus.data })
    .eq("id", parsedId.data)

  if (error) {
    console.error("Öğrenci başvuru durum güncelleme hatası:", error)
    return { success: false, error: "Durum güncellenemedi." }
  }

  revalidatePath("/mudur/talepler")
  return { success: true }
}
