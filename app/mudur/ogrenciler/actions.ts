"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { sqlArg } from "@/lib/supabase/sql-arg"

type ActionResult = { success: boolean; error?: string }

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: "Yetkisiz işlem." }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()
  if (profile?.role !== "admin") return { ok: false as const, error: "Yetkisiz işlem." }
  return { ok: true as const }
}

export async function assignCoach(
  studentId: string,
  coachId: string | null
): Promise<ActionResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, error: auth.error }

  // Oturum client'ı: RPC yetkiyi kontrol eder; students.coach_id trigger'ı
  // eski koçun aktif hedef/gelecek kalemlerini öğrenciye devreder, gelecek
  // randevularını iptal eder ve coach_assignment_history'ye yazar (migration 206).
  const supabase = await createClient()
  const { error } = await supabase.rpc("change_student_coach", {
    p_student_id: studentId,
    p_new_coach_id: sqlArg(coachId),
  })

  if (error) {
    console.error("Koç atama hatası:", error)
    return { success: false, error: error.code === "P0001" ? error.message : "Koç atanamadı, tekrar deneyin." }
  }

  revalidatePath("/mudur/ogrenciler")
  revalidatePath(`/mudur/ogrenciler/${studentId}`)
  revalidatePath("/mudur/koclar")
  return { success: true }
}

export type CoachChangePreview = { goals: number; items: number; appointments: number }

/** Koç değişirse ne olacak? (onay dialogu) — devir trigger'ıyla aynı koşullar (migration 210). */
export async function previewCoachChange(
  studentId: string,
): Promise<{ success: boolean; error?: string; data?: CoachChangePreview }> {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, error: auth.error }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc("coach_change_preview", { p_student_id: studentId })
  if (error || !data?.[0]) {
    console.error("Koç değişikliği önizleme hatası:", error)
    return { success: false, error: "Etki hesaplanamadı, tekrar deneyin." }
  }
  const { goals, items, appointments } = data[0]
  return { success: true, data: { goals, items, appointments } }
}

const updateSchema = z.object({
  full_name: z.string().trim().min(3),
  phone: z.string().trim().optional().nullable(),
  grade: z.enum(["7", "8", "9", "10", "11", "12", "Mezun"]).optional().nullable(),
  target_university: z.string().trim().optional().nullable(),
  target_department: z.string().trim().optional().nullable(),
  target_ranking: z.number().int().positive().optional().nullable(),
  parent_name: z.string().trim().optional().nullable(),
  parent_phone: z.string().trim().optional().nullable(),
})

export async function updateStudent(id: string, input: unknown): Promise<ActionResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, error: auth.error }

  const parsed = updateSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Form hatalı." }
  }

  const admin = supabaseAdmin()
  const data = parsed.data

  const { error: pErr } = await admin
    .from("profiles")
    .update({ full_name: data.full_name, phone: data.phone ?? null })
    .eq("id", id)
  if (pErr) {
    console.error("Profil güncelleme hatası:", pErr)
    return { success: false, error: "Güncellenemedi." }
  }

  const { error: sErr } = await admin
    .from("students")
    .update({
      grade: data.grade ?? null,
      target_university: data.target_university ?? null,
      target_department: data.target_department ?? null,
      target_ranking: data.target_ranking ?? null,
      parent_name: data.parent_name ?? null,
      parent_phone: data.parent_phone ?? null,
    })
    .eq("id", id)
  if (sErr) {
    console.error("Öğrenci güncelleme hatası:", sErr)
    return { success: false, error: "Güncellenemedi." }
  }

  revalidatePath("/mudur/ogrenciler")
  revalidatePath(`/mudur/ogrenciler/${id}`)
  return { success: true }
}

export async function toggleStudentActive(
  id: string,
  nextValue: boolean,
): Promise<ActionResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, error: auth.error }

  const admin = supabaseAdmin()
  const { error } = await admin
    .from("students")
    .update({ is_active: nextValue })
    .eq("id", id)

  if (error) {
    console.error("Öğrenci aktiflik güncelleme hatası:", error)
    return { success: false, error: "Durum güncellenemedi, tekrar deneyin." }
  }

  revalidatePath("/mudur/ogrenciler")
  revalidatePath(`/mudur/ogrenciler/${id}`)
  revalidatePath("/mudur")
  return { success: true }
}

export async function deleteStudent(id: string): Promise<ActionResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, error: auth.error }

  const supabase = await createClient()
  const { error } = await supabase.rpc("delete_student_safely", { student_uuid: id })

  if (error) {
    console.error("Öğrenci silme hatası:", error)
    return { success: false, error: error.message || "Silinemedi, tekrar deneyin." }
  }

  revalidatePath("/mudur/ogrenciler")
  revalidatePath("/mudur")
  return { success: true }
}

/**
 * Bireysel öğrenciyi kuruma bağla ve/veya koç ata. Kurum bağı service role ile
 * (profil kurum değişimi guard trigger'ında yalnız service role/admin'e açık);
 * koç ataması mevcut change_student_coach akışıyla (devir trigger'ı dahil).
 */
export async function assignIndividualStudent(
  studentId: string,
  organizationId: string | null,
  coachId: string | null,
): Promise<ActionResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, error: auth.error }
  if (!organizationId && !coachId) return { success: false, error: "Kurum veya koç seçin." }

  const ids = z.string().uuid()
  if (!ids.safeParse(studentId).success) return { success: false, error: "Geçersiz öğrenci." }
  if (organizationId && !ids.safeParse(organizationId).success) return { success: false, error: "Geçersiz kurum." }
  if (coachId && !ids.safeParse(coachId).success) return { success: false, error: "Geçersiz koç." }

  const admin = supabaseAdmin()
  if (organizationId) {
    const { data: org } = await admin.from("organizations").select("id").eq("id", organizationId).maybeSingle()
    if (!org) return { success: false, error: "Kurum bulunamadı." }
  }
  if (coachId) {
    const { data: coach } = await admin.from("profiles").select("role, organization_id").eq("id", coachId).maybeSingle()
    if (!coach || coach.role !== "coach") return { success: false, error: "Koç bulunamadı." }
    if ((coach.organization_id ?? null) !== (organizationId ?? null)) {
      return { success: false, error: organizationId ? "Seçilen koç bu kuruma ait değil." : "Kurum koçu için önce kurumu seçin." }
    }
  }

  try {
    if (organizationId) {
      const { error: sErr } = await admin.from("students").update({ organization_id: organizationId }).eq("id", studentId)
      if (sErr) throw sErr
      const { error: pErr } = await admin.from("profiles").update({ organization_id: organizationId }).eq("id", studentId)
      if (pErr) throw pErr
    }
    if (coachId) {
      const supabase = await createClient()
      const { error } = await supabase.rpc("change_student_coach", { p_student_id: studentId, p_new_coach_id: coachId })
      if (error) {
        console.error("Bireysel koç atama:", error)
        return { success: false, error: error.code === "P0001" ? error.message : "Koç atanamadı, tekrar deneyin." }
      }
    }
  } catch (err) {
    console.error("assignIndividualStudent:", err)
    return { success: false, error: "Bir hata oluştu, tekrar deneyin." }
  }

  revalidatePath("/mudur/bireysel-ogrenciler")
  revalidatePath("/mudur/ogrenciler")
  revalidatePath(`/mudur/ogrenciler/${studentId}`)
  return { success: true }
}
