"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { inviteStudent } from "@/lib/auth/invite"

type ActionResult = { success: boolean; error?: string }

const APPROVABLE_STATUSES = ["pending", "tanitim_tamamlandi"] as const
const REJECTABLE_STATUSES = ["pending", "tanitim_planlandi", "tanitim_tamamlandi"] as const

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
    .in("status", APPROVABLE_STATUSES as unknown as string[])
    .maybeSingle()

  if (fetchError || !app) {
    return { success: false, error: "Onaylanabilir başvuru bulunamadı." }
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

    // Tanıtım randevusu varsa, ona da student_id'yi bağla (geçmiş takibi için)
    if (app.tanitim_appointment_id) {
      await admin
        .from("appointments")
        .update({ student_id: invitedUser.id })
        .eq("id", app.tanitim_appointment_id)
    }
  } catch (err) {
    console.error("Başvuru onaylama hatası:", err)
    const message = err instanceof Error ? err.message : "Bir hata oluştu."
    return { success: false, error: message }
  }

  revalidatePath("/mudur/basvurular")
  revalidatePath("/mudur")
  revalidatePath("/mudur/ogrenciler")
  revalidatePath("/mudur/randevular")
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
    .in("status", REJECTABLE_STATUSES as unknown as string[])

  if (error) {
    console.error("Başvuru reddetme hatası:", error)
    return { success: false, error: "Bir hata oluştu, tekrar deneyin." }
  }

  revalidatePath("/mudur/basvurular")
  revalidatePath("/mudur")
  return { success: true }
}

const scheduleTanitimSchema = z.object({
  applicationId: z.string().uuid(),
  coachId: z.string().uuid("Bir koç seçin"),
  start_time: z.string().min(1, "Başlangıç saati gerekli"),
  end_time: z.string().min(1, "Bitiş saati gerekli"),
  meeting_link: z.string().url("Geçerli bir link").or(z.literal("")).optional(),
  notes: z.string().max(2000).optional(),
})

export type ScheduleTanitimInput = z.input<typeof scheduleTanitimSchema>

export async function scheduleTanitim(input: ScheduleTanitimInput): Promise<ActionResult & { appointmentId?: string }> {
  const parsed = scheduleTanitimSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Geçersiz veri" }
  }
  const data = parsed.data

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Yetkisiz işlem." }

  const startDate = new Date(data.start_time)
  const endDate = new Date(data.end_time)
  if (endDate <= startDate) {
    return { success: false, error: "Bitiş saati başlangıçtan sonra olmalı" }
  }

  const { data: app } = await supabase
    .from("applications")
    .select("id, full_name, status, tanitim_appointment_id")
    .eq("id", data.applicationId)
    .maybeSingle()

  if (!app) return { success: false, error: "Başvuru bulunamadı" }
  if (app.status === "approved" || app.status === "rejected") {
    return { success: false, error: "Bu başvuru onaylanmış veya reddedilmiş, tanıtım dersi planlanamaz" }
  }

  const admin = supabaseAdmin()

  // Eğer önceki bir tanıtım randevusu varsa onu iptal et
  if (app.tanitim_appointment_id) {
    await admin
      .from("appointments")
      .update({ status: "iptal" })
      .eq("id", app.tanitim_appointment_id)
  }

  const { data: appt, error: apptErr } = await admin
    .from("appointments")
    .insert({
      coach_id: data.coachId,
      student_id: null,
      application_id: app.id,
      title: `Tanıtım: ${app.full_name}`,
      type: "tanitim",
      status: "planlandi",
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      meeting_link: data.meeting_link?.trim() || null,
      notes: data.notes?.trim() || null,
      created_by: user.id,
    })
    .select("id")
    .single()

  if (apptErr || !appt) {
    return { success: false, error: apptErr?.message ?? "Randevu oluşturulamadı" }
  }

  const { error: updateErr } = await admin
    .from("applications")
    .update({
      status: "tanitim_planlandi",
      tanitim_appointment_id: appt.id,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", app.id)

  if (updateErr) {
    return { success: false, error: updateErr.message }
  }

  revalidatePath("/mudur/basvurular")
  revalidatePath("/mudur")
  revalidatePath("/mudur/randevular")
  revalidatePath("/koc/randevular")
  revalidatePath("/koc")
  return { success: true, appointmentId: appt.id }
}

export async function markTanitimCompleted(applicationId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Yetkisiz işlem." }

  const admin = supabaseAdmin()
  const { data: app } = await supabase
    .from("applications")
    .select("id, status, tanitim_appointment_id")
    .eq("id", applicationId)
    .maybeSingle()

  if (!app) return { success: false, error: "Başvuru bulunamadı" }
  if (app.status !== "tanitim_planlandi") {
    return { success: false, error: "Tanıtım planlanmamış bir başvuru tamamlanamaz" }
  }

  if (app.tanitim_appointment_id) {
    await admin
      .from("appointments")
      .update({ status: "tamamlandi" })
      .eq("id", app.tanitim_appointment_id)
  }

  const { error } = await admin
    .from("applications")
    .update({
      status: "tanitim_tamamlandi",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", applicationId)

  if (error) return { success: false, error: error.message }

  revalidatePath("/mudur/basvurular")
  revalidatePath("/mudur")
  return { success: true }
}
