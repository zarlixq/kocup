"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { inviteStudent } from "@/lib/auth/invite"

type ActionResult = { success: boolean; error?: string }

export async function approveApplication(
  applicationId: string,
  coachId?: string | null
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Yetkisiz işlem." }

  const { data: app, error: fetchError } = await supabase
    .from("applications")
    .select("*")
    .eq("id", applicationId)
    .eq("status", "pending")
    .maybeSingle()

  if (fetchError || !app) {
    return { success: false, error: "Başvuru bulunamadı." }
  }

  try {
    const invitedUser = await inviteStudent({
      email: app.email,
      full_name: app.full_name,
      phone: app.phone,
      grade: app.grade,
      target_university: app.target_university,
      target_department: app.target_department,
      target_ranking: app.target_ranking,
      parent_name: app.parent_name,
      parent_phone: app.parent_phone,
    })

    const admin = supabaseAdmin()

    await admin.from("students").insert({
      id: invitedUser.id,
      coach_id: coachId ?? null,
      grade: app.grade,
      target_university: app.target_university,
      target_department: app.target_department,
      target_ranking: app.target_ranking,
      parent_name: app.parent_name,
      parent_phone: app.parent_phone,
    })

    await admin
      .from("applications")
      .update({
        status: "approved",
        approved_student_id: invitedUser.id,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", applicationId)
  } catch (err) {
    console.error("Başvuru onaylama hatası:", err)
    const message = err instanceof Error ? err.message : "Bir hata oluştu."
    return { success: false, error: message }
  }

  revalidatePath("/mudur/basvurular")
  revalidatePath("/mudur")
  revalidatePath("/mudur/ogrenciler")
  return { success: true }
}

export async function rejectApplication(
  applicationId: string,
  reason: string
): Promise<ActionResult> {
  if (!reason || reason.trim().length < 10) {
    return { success: false, error: "Red gerekçesi en az 10 karakter olmalı." }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Yetkisiz işlem." }

  const { error } = await supabase
    .from("applications")
    .update({
      status: "rejected",
      rejection_reason: reason.trim(),
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", applicationId)
    .eq("status", "pending")

  if (error) {
    console.error("Başvuru reddetme hatası:", error)
    return { success: false, error: "Bir hata oluştu, tekrar deneyin." }
  }

  revalidatePath("/mudur/basvurular")
  revalidatePath("/mudur")
  return { success: true }
}
