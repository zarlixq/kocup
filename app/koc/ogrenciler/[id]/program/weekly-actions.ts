"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { isValidWeekStartParam } from "@/lib/week"

type Result = { success: boolean; error?: string }

const itemSchema = z
  .object({
    day_of_week: z.coerce.number().int().min(1).max(7),
    subject_id: z
      .string()
      .uuid()
      .nullish()
      .transform((v) => v ?? null),
    baslik: z
      .string()
      .trim()
      .max(120)
      .nullish()
      .transform((v) => (v && v.length > 0 ? v : null)),
    aciklama: z
      .string()
      .trim()
      .max(500)
      .nullish()
      .transform((v) => (v && v.length > 0 ? v : null)),
  })
  .refine((d) => d.subject_id || d.baslik, {
    message: "Ders seç veya konu/başlık gir.",
    path: ["baslik"],
  })

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

// O hafta için programı bul, yoksa oluştur; program id döndür.
async function ensureProgram(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studentId: string,
  weekStart: string,
  coachId: string,
): Promise<{ id: string } | { error: string }> {
  const { data: existing } = await supabase
    .from("weekly_programs")
    .select("id")
    .eq("student_id", studentId)
    .eq("week_start", weekStart)
    .maybeSingle()
  if (existing) return { id: existing.id }

  const { data: created, error } = await supabase
    .from("weekly_programs")
    .insert({ student_id: studentId, week_start: weekStart, created_by: coachId })
    .select("id")
    .single()
  if (error || !created) {
    // Yarış durumu: başka istek oluşturmuş olabilir, tekrar dene.
    const { data: retry } = await supabase
      .from("weekly_programs")
      .select("id")
      .eq("student_id", studentId)
      .eq("week_start", weekStart)
      .maybeSingle()
    if (retry) return { id: retry.id }
    console.error("Program oluşturma hatası:", error)
    return { error: "Program oluşturulamadı." }
  }
  return { id: created.id }
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

  const parsed = itemSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Form hatalı." }
  }

  const prog = await ensureProgram(auth.supabase, studentId, weekStart, auth.userId)
  if ("error" in prog) return { success: false, error: prog.error }

  const { error } = await auth.supabase.from("weekly_program_items").insert({
    program_id: prog.id,
    day_of_week: parsed.data.day_of_week,
    subject_id: parsed.data.subject_id,
    baslik: parsed.data.baslik,
    aciklama: parsed.data.aciklama,
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

  const parsed = itemSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Form hatalı." }
  }

  const { error } = await auth.supabase
    .from("weekly_program_items")
    .update({
      day_of_week: parsed.data.day_of_week,
      subject_id: parsed.data.subject_id,
      baslik: parsed.data.baslik,
      aciklama: parsed.data.aciklama,
    })
    .eq("id", itemId)
  if (error) {
    console.error("Program kalemi güncelleme hatası:", error)
    return { success: false, error: "Güncellenemedi, tekrar deneyin." }
  }

  revalidate(studentId)
  return { success: true }
}

export async function deleteProgramItem(
  studentId: string,
  itemId: string,
): Promise<Result> {
  const auth = await requireCoachOwnership(studentId)
  if (!auth.ok) return { success: false, error: auth.error }

  const { error } = await auth.supabase
    .from("weekly_program_items")
    .delete()
    .eq("id", itemId)
  if (error) {
    console.error("Program kalemi silme hatası:", error)
    return { success: false, error: "Silinemedi, tekrar deneyin." }
  }

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
    .select("id, day_of_week, subject_id, baslik, aciklama, program_id, is_completed")
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
      subject_id: s.subject_id,
      baslik: s.baslik,
      aciklama: s.aciklama,
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
