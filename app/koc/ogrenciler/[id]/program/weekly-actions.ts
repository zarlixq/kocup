"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { isValidWeekStartParam } from "@/lib/week"
import { programItemSchema, toItemColumns } from "@/lib/program/item-schema"
import { ensureProgram, topicBelongsToSubject } from "@/lib/program/ensure-program"

type Result = { success: boolean; error?: string }

async function requireCoachOwnership(studentId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: "Oturum bulunamadı." }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()
  if (profile?.role !== "coach") return { ok: false as const, error: "Yetkisiz işlem." }

  const { data: student } = await supabase
    .from("students")
    .select("coach_id")
    .eq("id", studentId)
    .maybeSingle()
  if (!student || student.coach_id !== user.id) {
    return { ok: false as const, error: "Bu öğrenci size atanmamış." }
  }
  return { ok: true as const, supabase, userId: user.id }
}

type Supabase = Awaited<ReturnType<typeof createClient>>

// Öğrencinin eklediği kalemi koç düzenleyemez (DB trigger'ı da reddeder;
// burada kullanıcı dostu mesaj için önceden kontrol).
async function requireCoachItem(supabase: Supabase, itemId: string) {
  const { data } = await supabase
    .from("weekly_program_items")
    .select("created_by_role")
    .eq("id", itemId)
    .maybeSingle()
  if (!data) return { ok: false as const, error: "Kalem bulunamadı." }
  if (data.created_by_role === "student") {
    return { ok: false as const, error: "Öğrencinin eklediği kalemi düzenleyemezsiniz; yalnızca silebilirsiniz." }
  }
  return { ok: true as const }
}

function revalidate(studentId: string) {
  revalidatePath(`/koc/ogrenciler/${studentId}/program`)
  revalidatePath(`/mudur/ogrenciler/${studentId}/program`)
  revalidatePath("/ogrenci/program")
}

export async function createProgramItem(
  studentId: string,
  weekStart: string,
  input: unknown,
): Promise<Result> {
  const auth = await requireCoachOwnership(studentId)
  if (!auth.ok) return { success: false, error: auth.error }
  if (!isValidWeekStartParam(weekStart)) return { success: false, error: "Geçersiz hafta." }

  const parsed = programItemSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Form hatalı." }
  }
  if (!(await topicBelongsToSubject(auth.supabase, parsed.data.topic_id, parsed.data.subject_id))) {
    return { success: false, error: "Seçilen konu bu derse ait değil." }
  }

  const prog = await ensureProgram(auth.supabase, studentId, weekStart, auth.userId)
  if ("error" in prog) return { success: false, error: prog.error }

  // created_by_role DB trigger'ı ile 'coach' yazılır.
  const { error } = await auth.supabase.from("weekly_program_items").insert({
    program_id: prog.id,
    ...toItemColumns(parsed.data),
  })
  if (error) {
    console.error("Program kalemi ekleme hatası:", error)
    return { success: false, error: "Kalem eklenemedi, tekrar deneyin." }
  }

  revalidate(studentId)
  return { success: true }
}

export async function updateProgramItem(
  studentId: string,
  itemId: string,
  input: unknown,
): Promise<Result> {
  const auth = await requireCoachOwnership(studentId)
  if (!auth.ok) return { success: false, error: auth.error }

  const parsed = programItemSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Form hatalı." }
  }
  if (!(await topicBelongsToSubject(auth.supabase, parsed.data.topic_id, parsed.data.subject_id))) {
    return { success: false, error: "Seçilen konu bu derse ait değil." }
  }

  const owned = await requireCoachItem(auth.supabase, itemId)
  if (!owned.ok) return { success: false, error: owned.error }

  const { data: updated, error } = await auth.supabase
    .from("weekly_program_items")
    .update(toItemColumns(parsed.data))
    .eq("id", itemId)
    .select("id")
  if (error) {
    console.error("Program kalemi güncelleme hatası:", error)
    return { success: false, error: "Güncellenemedi, tekrar deneyin." }
  }
  if (!updated || updated.length === 0) return { success: false, error: "Kalem bulunamadı." }

  revalidate(studentId)
  return { success: true }
}

export async function deleteProgramItem(
  studentId: string,
  itemId: string,
): Promise<Result> {
  const auth = await requireCoachOwnership(studentId)
  if (!auth.ok) return { success: false, error: auth.error }

  // Koç öğrencinin eklediği kalemi de silebilir (karar: görür + siler, düzenleyemez).
  const { data: deleted, error } = await auth.supabase
    .from("weekly_program_items")
    .delete()
    .eq("id", itemId)
    .select("id")
  if (error) {
    console.error("Program kalemi silme hatası:", error)
    return { success: false, error: "Silinemedi, tekrar deneyin." }
  }
  if (!deleted || deleted.length === 0) return { success: false, error: "Kalem bulunamadı." }

  revalidate(studentId)
  return { success: true }
}

// Önceki haftadan tamamlanmamış kalemleri bu haftaya kopyalar.
export async function carryForwardItems(
  studentId: string,
  weekStart: string,
  sourceItemIds: string[],
): Promise<Result> {
  const auth = await requireCoachOwnership(studentId)
  if (!auth.ok) return { success: false, error: auth.error }
  if (!isValidWeekStartParam(weekStart)) return { success: false, error: "Geçersiz hafta." }
  if (!Array.isArray(sourceItemIds) || sourceItemIds.length === 0) {
    return { success: false, error: "Taşınacak kalem seçilmedi." }
  }

  // Kaynak kalemleri getir (RLS: koç görebiliyor).
  const { data: sources, error: srcErr } = await auth.supabase
    .from("weekly_program_items")
    .select("id, day_of_week, start_time, end_time, subject_id, topic_id, baslik, aciklama, hedef_soru, program_id, is_completed")
    .in("id", sourceItemIds)
  if (srcErr) {
    console.error("Carry-forward kaynak hatası:", srcErr)
    return { success: false, error: "Kalemler getirilemedi." }
  }
  const valid = (sources ?? []).filter((s) => !s.is_completed)
  if (valid.length === 0) return { success: false, error: "Taşınacak uygun kalem yok." }

  const prog = await ensureProgram(auth.supabase, studentId, weekStart, auth.userId)
  if ("error" in prog) return { success: false, error: prog.error }

  // Bu haftada zaten taşınmış olanları atla (idempotent).
  const { data: already } = await auth.supabase
    .from("weekly_program_items")
    .select("carried_from_item_id")
    .eq("program_id", prog.id)
    .not("carried_from_item_id", "is", null)
  const alreadySet = new Set((already ?? []).map((r) => r.carried_from_item_id))

  const rows = valid
    .filter((s) => !alreadySet.has(s.id))
    .map((s) => ({
      program_id: prog.id,
      day_of_week: s.day_of_week,
      start_time: s.start_time,
      end_time: s.end_time,
      subject_id: s.subject_id,
      topic_id: s.topic_id,
      baslik: s.baslik,
      aciklama: s.aciklama,
      hedef_soru: s.hedef_soru,
      carried_from_item_id: s.id,
    }))

  if (rows.length === 0) return { success: true }

  const { error } = await auth.supabase.from("weekly_program_items").insert(rows)
  if (error) {
    console.error("Carry-forward ekleme hatası:", error)
    return { success: false, error: "Kalemler taşınamadı." }
  }

  revalidate(studentId)
  return { success: true }
}

// Sürükle-bırak: kalemi başka güne taşı (yalnızca koçun kendi kalemleri).
export async function moveProgramItem(
  studentId: string,
  itemId: string,
  dayOfWeek: number,
): Promise<Result> {
  const auth = await requireCoachOwnership(studentId)
  if (!auth.ok) return { success: false, error: auth.error }
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 1 || dayOfWeek > 7) {
    return { success: false, error: "Geçersiz gün." }
  }
  const owned = await requireCoachItem(auth.supabase, itemId)
  if (!owned.ok) return { success: false, error: owned.error }

  const { data: updated, error } = await auth.supabase
    .from("weekly_program_items")
    .update({ day_of_week: dayOfWeek })
    .eq("id", itemId)
    .select("id")
  if (error) {
    console.error("Program kalemi taşıma hatası:", error)
    return { success: false, error: "Taşınamadı, tekrar deneyin." }
  }
  if (!updated || updated.length === 0) return { success: false, error: "Kalem bulunamadı." }

  revalidate(studentId)
  return { success: true }
}
