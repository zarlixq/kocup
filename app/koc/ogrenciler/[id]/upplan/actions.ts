"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { generateRoadmapDraft, parsePayload } from "@/lib/upplan/roadmap-service"
import { applyProgramDraft, generateProgramDraft } from "@/lib/upplan/program-service"

type ActionResult<T = undefined> = { success: boolean; error?: string; data?: T }

const uuid = z.string().uuid()
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

// Koçlu öğrencide UpPlan önerileri koça gelir; koç tümünü ya da seçtiklerini
// KENDİ ataması olarak kabul eder (oturum client'ı → created_by_role='coach').
async function requireCoachOf(studentId: string) {
  if (!uuid.safeParse(studentId).success) return { ok: false as const, error: "Öğrenci bulunamadı." }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: "Oturum bulunamadı." }
  const { data: student } = await supabase.from("students").select("coach_id").eq("id", studentId).maybeSingle()
  if (!student || student.coach_id !== user.id) return { ok: false as const, error: "Bu öğrenci size atanmamış." }
  return { ok: true as const, supabase, coachId: user.id }
}

function revalidateCoach(studentId: string) {
  revalidatePath(`/koc/ogrenciler/${studentId}/upplan`)
  revalidatePath(`/koc/ogrenciler/${studentId}/program`)
  revalidatePath(`/koc/ogrenciler/${studentId}/konu-analizi`)
  revalidatePath("/ogrenci/konularim")
  revalidatePath("/ogrenci/program")
  revalidatePath("/ogrenci")
}

export async function regenerateStudentRoadmap(studentId: string): Promise<ActionResult> {
  try {
    const auth = await requireCoachOf(studentId)
    if (!auth.ok) return { success: false, error: auth.error }
    const res = await generateRoadmapDraft(supabaseAdmin(), studentId)
    if ("error" in res) return { success: false, error: res.error }
    revalidateCoach(studentId)
    return { success: true }
  } catch (e) {
    console.error("regenerateStudentRoadmap", e)
    return { success: false, error: "Bir hata oluştu, tekrar deneyin." }
  }
}

/** Yol haritası önerisinden seçilen konuları koç ataması olarak ekler (aynı konuda aktif hedef varsa atlar). */
export async function acceptRoadmapSuggestions(studentId: string, topicIds: unknown): Promise<ActionResult<{ added: number; skipped: number }>> {
  try {
    const parsed = z.array(uuid).min(1).max(300).safeParse(topicIds)
    if (!parsed.success) return { success: false, error: "En az bir konu seç." }
    const auth = await requireCoachOf(studentId)
    if (!auth.ok) return { success: false, error: auth.error }

    const { data: rm } = await auth.supabase.from("upplan_roadmaps").select("payload").eq("student_id", studentId).maybeSingle()
    const payload = parsePayload(rm?.payload)
    if (!payload) return { success: false, error: "Öneri bulunamadı." }

    const { data: active } = await auth.supabase
      .from("topic_assignments")
      .select("topic_id")
      .eq("student_id", studentId)
      .eq("status", "aktif")
    const busy = new Set((active ?? []).map((a) => a.topic_id))
    const want = new Set(parsed.data)
    const items = payload.items.filter((i) => want.has(i.topic_id) && !i.existing && !busy.has(i.topic_id))
    if (items.length === 0) return { success: false, error: "Seçilen konuların hepsinde zaten aktif hedef var." }

    const { error } = await auth.supabase.from("topic_assignments").insert(
      items.map((i) => ({
        coach_id: auth.coachId,
        student_id: studentId,
        topic_id: i.topic_id,
        hedef_soru: i.target_questions,
        hedef_dogruluk: i.target_accuracy,
        baslangic_tarihi: i.start,
        son_tarih: i.end < i.start ? i.start : i.end,
        status: "aktif" as const,
        notes: i.reasons[0] ?? null,
        created_by: auth.coachId,
        block_type: i.block_type,
        plan_order: i.plan_order,
        wave: i.wave,
        origin: "upplan",
      })),
    )
    if (error) {
      console.error("acceptRoadmapSuggestions", error)
      return { success: false, error: "Hedefler eklenemedi." }
    }
    revalidateCoach(studentId)
    return { success: true, data: { added: items.length, skipped: parsed.data.length - items.length } }
  } catch (e) {
    console.error("acceptRoadmapSuggestions", e)
    return { success: false, error: "Bir hata oluştu, tekrar deneyin." }
  }
}

export async function generateStudentProgramSuggestion(studentId: string, weekStart: string): Promise<ActionResult<{ count: number }>> {
  try {
    if (!isoDate.safeParse(weekStart).success) return { success: false, error: "Geçersiz hafta." }
    const auth = await requireCoachOf(studentId)
    if (!auth.ok) return { success: false, error: auth.error }
    const res = await generateProgramDraft(supabaseAdmin(), studentId, weekStart)
    if ("error" in res) return { success: false, error: res.error }
    revalidateCoach(studentId)
    return { success: true, data: { count: res.items.length } }
  } catch (e) {
    console.error("generateStudentProgramSuggestion", e)
    return { success: false, error: "Bir hata oluştu, tekrar deneyin." }
  }
}

/** Program önerisini (tümü ya da seçilen kalemler) koç kalemi olarak programa ekler. */
export async function acceptProgramSuggestion(studentId: string, weekStart: string, indices: unknown): Promise<ActionResult<{ count: number }>> {
  try {
    if (!isoDate.safeParse(weekStart).success) return { success: false, error: "Geçersiz hafta." }
    const pick = z.array(z.number().int().min(0).max(500)).max(500).nullable().safeParse(indices)
    if (!pick.success) return { success: false, error: "Geçersiz seçim." }
    const auth = await requireCoachOf(studentId)
    if (!auth.ok) return { success: false, error: auth.error }
    const res = await applyProgramDraft(supabaseAdmin(), auth.supabase, studentId, weekStart, auth.coachId, pick.data ?? undefined)
    if (res.error) return { success: false, error: res.error }
    revalidateCoach(studentId)
    return { success: true, data: { count: res.count ?? 0 } }
  } catch (e) {
    console.error("acceptProgramSuggestion", e)
    return { success: false, error: "Bir hata oluştu, tekrar deneyin." }
  }
}
