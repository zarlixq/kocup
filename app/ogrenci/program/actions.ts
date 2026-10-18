"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { isValidWeekStartParam } from "@/lib/week"
import { programItemSchema, toItemColumns } from "@/lib/program/item-schema"
import { ensureProgram, topicBelongsToSubject } from "@/lib/program/ensure-program"

type Result = { success: boolean; error?: string }

type Supabase = Awaited<ReturnType<typeof createClient>>

function revalidate(studentId: string) {
  revalidatePath("/ogrenci/program")
  revalidatePath("/ogrenci")
  revalidatePath(`/koc/ogrenciler/${studentId}/program`)
  revalidatePath(`/mudur/ogrenciler/${studentId}/program`)
}

async function getUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

// Öğrenci yalnızca kendi eklediği kalemi düzenler/taşır/siler. RLS + trigger
// (migration 201) zaten zorlar; burada anlaşılır mesaj için önceden kontrol.
async function requireOwnItem(supabase: Supabase, userId: string, itemId: string) {
  const { data } = await supabase
    .from("weekly_program_items")
    .select("id, created_by_role, weekly_programs!inner(student_id)")
    .eq("id", itemId)
    .eq("weekly_programs.student_id", userId)
    .maybeSingle()
  if (!data) return { ok: false as const, error: "Kalem bulunamadı." }
  if (data.created_by_role !== "student") {
    return {
      ok: false as const,
      error: "Koçunun eklediği kalemi düzenleyemezsin; yalnızca tamamlandı işaretleyebilirsin.",
    }
  }
  return { ok: true as const }
}

// Öğrenci kendi program kalemini (koçun eklediği dahil) yaptım/yapmadım işaretler.
// Koç kaleminde DB yalnızca is_completed + completed_at değişikliğine izin verir.
export async function toggleProgramItemDone(itemId: string, isCompleted: boolean): Promise<Result> {
  if (!itemId) return { success: false, error: "Kalem bulunamadı." }

  const { supabase, user } = await getUser()
  if (!user) return { success: false, error: "Oturum bulunamadı." }

  const { data: updated, error } = await supabase
    .from("weekly_program_items")
    .update({
      is_completed: isCompleted,
      completed_at: isCompleted ? new Date().toISOString() : null,
    })
    .eq("id", itemId)
    .select("id")

  if (error) {
    console.error("Program kalemi işaretleme hatası:", error)
    return { success: false, error: "İşaretlenemedi, tekrar deneyin." }
  }
  if (!updated || updated.length === 0) return { success: false, error: "Kalem bulunamadı." }

  revalidate(user.id)
  return { success: true }
}

export async function createMyProgramItem(weekStart: string, input: unknown): Promise<Result> {
  try {
    if (!isValidWeekStartParam(weekStart)) return { success: false, error: "Geçersiz hafta." }
    const parsed = programItemSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Form hatalı." }
    }

    const { supabase, user } = await getUser()
    if (!user) return { success: false, error: "Oturum bulunamadı." }

    if (!(await topicBelongsToSubject(supabase, parsed.data.topic_id, parsed.data.subject_id))) {
      return { success: false, error: "Seçilen konu bu derse ait değil." }
    }

    const prog = await ensureProgram(supabase, user.id, weekStart, user.id)
    if ("error" in prog) return { success: false, error: prog.error }

    // created_by_role DB trigger'ı ile 'student' yazılır.
    const { error } = await supabase.from("weekly_program_items").insert({
      program_id: prog.id,
      ...toItemColumns(parsed.data),
    })
    if (error) {
      console.error("Öğrenci program kalemi ekleme hatası:", error)
      return { success: false, error: "Kalem eklenemedi, tekrar deneyin." }
    }

    revalidate(user.id)
    return { success: true }
  } catch (e) {
    console.error("createMyProgramItem", e)
    return { success: false, error: "Bir hata oluştu, tekrar deneyin." }
  }
}

export async function updateMyProgramItem(itemId: string, input: unknown): Promise<Result> {
  try {
    const parsed = programItemSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Form hatalı." }
    }

    const { supabase, user } = await getUser()
    if (!user) return { success: false, error: "Oturum bulunamadı." }

    const own = await requireOwnItem(supabase, user.id, itemId)
    if (!own.ok) return { success: false, error: own.error }
    if (!(await topicBelongsToSubject(supabase, parsed.data.topic_id, parsed.data.subject_id))) {
      return { success: false, error: "Seçilen konu bu derse ait değil." }
    }

    const { data: updated, error } = await supabase
      .from("weekly_program_items")
      .update(toItemColumns(parsed.data))
      .eq("id", itemId)
      .select("id")
    if (error) {
      console.error("Öğrenci program kalemi güncelleme hatası:", error)
      return { success: false, error: "Güncellenemedi, tekrar deneyin." }
    }
    if (!updated || updated.length === 0) return { success: false, error: "Kalem bulunamadı." }

    revalidate(user.id)
    return { success: true }
  } catch (e) {
    console.error("updateMyProgramItem", e)
    return { success: false, error: "Bir hata oluştu, tekrar deneyin." }
  }
}

// Sürükle-bırak: kendi kalemini başka güne taşı.
export async function moveMyProgramItem(itemId: string, dayOfWeek: number): Promise<Result> {
  try {
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 1 || dayOfWeek > 7) {
      return { success: false, error: "Geçersiz gün." }
    }
    const { supabase, user } = await getUser()
    if (!user) return { success: false, error: "Oturum bulunamadı." }

    const own = await requireOwnItem(supabase, user.id, itemId)
    if (!own.ok) return { success: false, error: own.error }

    const { data: updated, error } = await supabase
      .from("weekly_program_items")
      .update({ day_of_week: dayOfWeek })
      .eq("id", itemId)
      .select("id")
    if (error) {
      console.error("Öğrenci program kalemi taşıma hatası:", error)
      return { success: false, error: "Taşınamadı, tekrar deneyin." }
    }
    if (!updated || updated.length === 0) return { success: false, error: "Kalem bulunamadı." }

    revalidate(user.id)
    return { success: true }
  } catch (e) {
    console.error("moveMyProgramItem", e)
    return { success: false, error: "Bir hata oluştu, tekrar deneyin." }
  }
}

export async function deleteMyProgramItem(itemId: string): Promise<Result> {
  try {
    const { supabase, user } = await getUser()
    if (!user) return { success: false, error: "Oturum bulunamadı." }

    const own = await requireOwnItem(supabase, user.id, itemId)
    if (!own.ok) return { success: false, error: own.error }

    const { data: deleted, error } = await supabase
      .from("weekly_program_items")
      .delete()
      .eq("id", itemId)
      .select("id")
    if (error) {
      console.error("Öğrenci program kalemi silme hatası:", error)
      return { success: false, error: "Silinemedi, tekrar deneyin." }
    }
    if (!deleted || deleted.length === 0) return { success: false, error: "Kalem bulunamadı." }

    revalidate(user.id)
    return { success: true }
  } catch (e) {
    console.error("deleteMyProgramItem", e)
    return { success: false, error: "Bir hata oluştu, tekrar deneyin." }
  }
}
