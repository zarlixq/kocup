"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { saveUiPreference } from "@/lib/analytics/ui-preferences-actions"
import { mergeAnalizFilter } from "@/lib/analytics/analiz/filter"
import { ensureProgram } from "@/lib/program/ensure-program"
import { istanbulDateStr, istanbulWeekStartStr } from "@/lib/tz"

type ActionResult = { success: boolean; error?: string }

/** Analizim filtresi kalıcı (user_ui_preferences, kullanıcı başına). */
export async function saveAnalizFilter(raw: unknown): Promise<ActionResult> {
  try {
    const f = mergeAnalizFilter(raw)
    return await saveUiPreference("analiz_filter", f)
  } catch (e) {
    console.error("saveAnalizFilter", e)
    return { success: false, error: "Tercih kaydedilemedi." }
  }
}

/**
 * "Programa ekle": konuyu bu haftanın programına bugün için konu çalışması
 * kalemi olarak ekler (öğrenci kalemi; created_by_role trigger'la 'student').
 */
export async function addTopicToProgram(topicId: string): Promise<ActionResult> {
  try {
    if (!z.string().uuid().safeParse(topicId).success) return { success: false, error: "Geçersiz konu." }
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Oturum bulunamadı." }
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    if (profile?.role !== "student") return { success: false, error: "Yetkisiz işlem." }

    const { data: topic } = await supabase.from("topics").select("id, subject_id").eq("id", topicId).maybeSingle()
    if (!topic) return { success: false, error: "Konu bulunamadı." }

    const weekStart = istanbulWeekStartStr()
    const prog = await ensureProgram(supabase, user.id, weekStart, user.id)
    if ("error" in prog) return { success: false, error: prog.error }

    const { data: existing } = await supabase
      .from("weekly_program_items")
      .select("id")
      .eq("program_id", prog.id)
      .eq("topic_id", topicId)
      .eq("is_completed", false)
      .limit(1)
    if (existing?.length) return { success: false, error: "Bu konu bu haftaki programında zaten var." }

    const dow = new Date(`${istanbulDateStr()}T12:00:00Z`).getUTCDay()
    const { error } = await supabase.from("weekly_program_items").insert({
      program_id: prog.id,
      day_of_week: dow === 0 ? 7 : dow,
      subject_id: topic.subject_id,
      topic_id: topicId,
      block_type: "konu_calisma",
    })
    if (error) {
      console.error("addTopicToProgram", error)
      return { success: false, error: "Programa eklenemedi, tekrar deneyin." }
    }
    revalidatePath("/ogrenci/program")
    revalidatePath("/ogrenci")
    return { success: true }
  } catch (e) {
    console.error("addTopicToProgram", e)
    return { success: false, error: "Bir hata oluştu, tekrar deneyin." }
  }
}
