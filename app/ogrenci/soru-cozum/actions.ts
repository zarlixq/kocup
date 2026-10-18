"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { resolveCounts } from "@/lib/soru-cozum/counts"
import { istanbulDateStr } from "@/lib/tz"

type ActionResult<T = undefined> = { success: boolean; error?: string; data?: T }

type Supabase = Awaited<ReturnType<typeof createClient>>

const count = z.number().int().min(0).nullable()

const sessionSchema = z.object({
  subject_id: z.string().uuid("Ders seçilmedi."),
  topic_id: z.string().uuid().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Geçerli bir tarih girin."),
  total: count,
  correct: count,
  wrong: count,
  empty: count,
  duration_minutes: z.number().int().min(1, "Süre en az 1 dakika olmalı.").max(1440, "Süre en fazla 1440 dakika olabilir.").nullable(),
  resource_id: z.string().uuid().nullable(),
})

export type SessionInput = z.infer<typeof sessionSchema>

type ValidRow = {
  subject_id: string
  topic_id: string | null
  date: string
  correct: number
  wrong: number
  empty: number
  total_questions: number
  duration_minutes: number | null
  resource_id: string | null
}

async function validate(
  supabase: Supabase,
  input: unknown,
  opts: { requireTopic: boolean },
): Promise<{ row: ValidRow } | { error: string }> {
  const parsed = sessionSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Form hatalı." }
  const d = parsed.data

  if (d.date > istanbulDateStr()) return { error: "Gelecek bir tarihe kayıt giremezsin." }

  const counts = resolveCounts({ total: d.total, correct: d.correct, wrong: d.wrong, empty: d.empty })
  if (counts.status !== "ok") return { error: counts.message }

  if (opts.requireTopic) {
    if (d.topic_id) {
      // Konu ↔ ders tutarlılığı DB'de CHECK ile yazılamaz (bkz. migration 197).
      const { data: topic } = await supabase
        .from("topics")
        .select("subject_id")
        .eq("id", d.topic_id)
        .maybeSingle()
      if (!topic || topic.subject_id !== d.subject_id) return { error: "Seçilen konu bu derse ait değil." }
    } else {
      const { count: topicCount } = await supabase
        .from("topics")
        .select("id", { count: "exact", head: true })
        .eq("subject_id", d.subject_id)
      if ((topicCount ?? 0) > 0) return { error: "Konu seçmelisin." }
    }
  }

  if (d.resource_id) {
    // resources RLS org-izoleli: başka kurumun kaynağı burada görünmez.
    const { data: res } = await supabase.from("resources").select("id").eq("id", d.resource_id).maybeSingle()
    if (!res) return { error: "Seçilen kaynak bulunamadı." }
  }

  return {
    row: {
      subject_id: d.subject_id,
      topic_id: d.topic_id,
      date: d.date,
      correct: counts.correct,
      wrong: counts.wrong,
      empty: counts.empty,
      total_questions: counts.total,
      duration_minutes: d.duration_minutes,
      resource_id: d.resource_id,
    },
  }
}

function revalidateAll(studentId: string) {
  revalidatePath("/ogrenci")
  revalidatePath("/ogrenci/soru-cozum")
  revalidatePath("/ogrenci/analizim")
  revalidatePath("/ogrenci/konularim")
  revalidatePath(`/koc/ogrenciler/${studentId}/soru-cozum`)
}

export async function createSessionAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Oturum bulunamadı." }

    const v = await validate(supabase, input, { requireTopic: true })
    if ("error" in v) return { success: false, error: v.error }

    const { data, error } = await supabase
      .from("study_sessions")
      .insert({ ...v.row, student_id: user.id, created_by: user.id })
      .select("id")
      .single()

    if (error || !data) {
      console.error("createSessionAction", error)
      return { success: false, error: "Kayıt eklenemedi, tekrar dene." }
    }

    revalidateAll(user.id)
    return { success: true, data: { id: data.id } }
  } catch (e) {
    console.error("createSessionAction", e)
    return { success: false, error: "Bir hata oluştu, tekrar deneyin." }
  }
}

export async function updateSessionAction(sessionId: string, input: unknown): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Oturum bulunamadı." }

    const { data: existing } = await supabase
      .from("study_sessions")
      .select("id, subject_id, topic_id, assignment_id")
      .eq("id", sessionId)
      .eq("student_id", user.id)
      .maybeSingle()
    if (!existing) return { success: false, error: "Kayıt bulunamadı." }

    // Koç atamasına bağlı kayıtlarda ders/konu atamadan gelir, değiştirilemez.
    const locked = existing.assignment_id != null
    const raw = locked && typeof input === "object" && input !== null
      ? { ...input, subject_id: existing.subject_id, topic_id: existing.topic_id }
      : input

    const v = await validate(supabase, raw, { requireTopic: !locked })
    if ("error" in v) return { success: false, error: v.error }

    const { data, error } = await supabase
      .from("study_sessions")
      .update(v.row)
      .eq("id", sessionId)
      .eq("student_id", user.id)
      .select("id")

    if (error) {
      console.error("updateSessionAction", error)
      return { success: false, error: "Kayıt güncellenemedi, tekrar dene." }
    }
    if (!data || data.length === 0) return { success: false, error: "Kayıt bulunamadı." }

    revalidateAll(user.id)
    return { success: true }
  } catch (e) {
    console.error("updateSessionAction", e)
    return { success: false, error: "Bir hata oluştu, tekrar deneyin." }
  }
}

export async function deleteSessionAction(sessionId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Oturum bulunamadı." }

    // .select() → RLS 0 satır etkilerse sessizce "başarılı" dönmesin.
    const { data, error } = await supabase
      .from("study_sessions")
      .delete()
      .eq("id", sessionId)
      .eq("student_id", user.id)
      .select("id")

    if (error) {
      console.error("deleteSessionAction", error)
      return { success: false, error: "Kayıt silinemedi, tekrar dene." }
    }
    if (!data || data.length === 0) return { success: false, error: "Kayıt bulunamadı." }

    revalidateAll(user.id)
    return { success: true }
  } catch (e) {
    console.error("deleteSessionAction", e)
    return { success: false, error: "Bir hata oluştu, tekrar deneyin." }
  }
}
