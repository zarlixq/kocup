"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { profileSchema, type SetupStep } from "@/lib/upplan/profile"
import { SELF_ASSESSMENTS, type SelfAssessment } from "@/lib/upplan/mastery"

type ActionResult<T = undefined> = { success: boolean; error?: string; data?: T }

async function requireStudent() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: "Oturum bulunamadı." }
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
  if (profile?.role !== "student") return { ok: false as const, error: "Yetkisiz işlem." }
  return { ok: true as const, supabase, userId: user.id }
}

function revalidateUpplan(studentId: string) {
  revalidatePath("/ogrenci")
  revalidatePath("/ogrenci/upplan")
  revalidatePath(`/koc/ogrenciler/${studentId}/upplan`)
  revalidatePath(`/kurum/ogrenciler/${studentId}`)
}

const STEP_ORDER: SetupStep[] = ["profil", "tarama", "deneme", "bitti"]

/** Profil kaydı (kurulum ya da sonradan düzenleme). Kurulumda adımı ilerletir. */
export async function saveUpplanProfile(input: unknown): Promise<ActionResult> {
  try {
    const parsed = profileSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Form hatalı." }
    const auth = await requireStudent()
    if (!auth.ok) return { success: false, error: auth.error }

    const p = parsed.data
    const { data: existing } = await auth.supabase
      .from("student_upplan_profile")
      .select("setup_step")
      .eq("student_id", auth.userId)
      .maybeSingle()
    const step = existing?.setup_step && existing.setup_step !== "profil" ? existing.setup_step : "tarama"

    const { error } = await auth.supabase.from("student_upplan_profile").upsert({
      student_id: auth.userId,
      status: p.status,
      grade: p.status === "lise" ? p.grade : null,
      segment: p.segment,
      alan: p.segment === "lgs" ? null : p.alan,
      availability: p.availability,
      focus_minutes: p.focus_minutes,
      target_department: p.target_department,
      target_ranking: p.target_ranking,
      setup_step: step,
    })
    if (error) {
      console.error("saveUpplanProfile", error)
      return { success: false, error: "Profil kaydedilemedi, tekrar dene." }
    }
    revalidateUpplan(auth.userId)
    return { success: true }
  } catch (e) {
    console.error("saveUpplanProfile", e)
    return { success: false, error: "Bir hata oluştu, tekrar deneyin." }
  }
}

const assessmentSchema = z
  .array(
    z.object({
      topic_id: z.string().uuid(),
      status: z.enum(SELF_ASSESSMENTS as [SelfAssessment, ...SelfAssessment[]]).nullable(),
    }),
  )
  .min(1)
  .max(1000)

/** Konu taraması — toplu upsert; status null → işaret kaldırılır. Ustalık trigger'la güncellenir. */
export async function saveSelfAssessments(items: unknown): Promise<ActionResult> {
  try {
    const parsed = assessmentSchema.safeParse(items)
    if (!parsed.success) return { success: false, error: "Geçersiz tarama verisi." }
    const auth = await requireStudent()
    if (!auth.ok) return { success: false, error: auth.error }

    const upserts = parsed.data.flatMap((i) =>
      i.status ? [{ student_id: auth.userId, topic_id: i.topic_id, status: i.status }] : [],
    )
    const removals = parsed.data.filter((i) => !i.status).map((i) => i.topic_id)

    if (upserts.length) {
      const { error } = await auth.supabase.from("student_topic_self_assessment").upsert(upserts)
      if (error) {
        console.error("saveSelfAssessments upsert", error)
        return { success: false, error: "Tarama kaydedilemedi, tekrar dene." }
      }
    }
    if (removals.length) {
      const { error } = await auth.supabase
        .from("student_topic_self_assessment")
        .delete()
        .eq("student_id", auth.userId)
        .in("topic_id", removals)
      if (error) {
        console.error("saveSelfAssessments delete", error)
        return { success: false, error: "Tarama kaydedilemedi, tekrar dene." }
      }
    }
    revalidateUpplan(auth.userId)
    return { success: true }
  } catch (e) {
    console.error("saveSelfAssessments", e)
    return { success: false, error: "Bir hata oluştu, tekrar deneyin." }
  }
}

/** Kurulum adımı (yalnız ileri; "bitti" kurulumu tamamlar). firstCompletion → dönüşüm olayı. */
export async function advanceSetup(step: unknown): Promise<ActionResult<{ firstCompletion: boolean }>> {
  try {
    const parsed = z.enum(["tarama", "deneme", "bitti"]).safeParse(step)
    if (!parsed.success) return { success: false, error: "Geçersiz adım." }
    const auth = await requireStudent()
    if (!auth.ok) return { success: false, error: auth.error }

    const { data: existing } = await auth.supabase
      .from("student_upplan_profile")
      .select("setup_step, completed_at")
      .eq("student_id", auth.userId)
      .maybeSingle()
    if (!existing) return { success: false, error: "Önce profilini doldur." }

    const current = STEP_ORDER.indexOf(existing.setup_step as SetupStep)
    const next = STEP_ORDER.indexOf(parsed.data)
    const { error } = await auth.supabase
      .from("student_upplan_profile")
      .update({
        setup_step: next > current ? parsed.data : existing.setup_step,
        completed_at: parsed.data === "bitti" ? (existing.completed_at ?? new Date().toISOString()) : existing.completed_at,
      })
      .eq("student_id", auth.userId)
    if (error) {
      console.error("advanceSetup", error)
      return { success: false, error: "Kaydedilemedi, tekrar dene." }
    }
    revalidateUpplan(auth.userId)
    return { success: true, data: { firstCompletion: parsed.data === "bitti" && !existing.completed_at } }
  } catch (e) {
    console.error("advanceSetup", e)
    return { success: false, error: "Bir hata oluştu, tekrar deneyin." }
  }
}
