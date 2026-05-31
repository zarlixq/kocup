"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

type Result = { success: boolean; error?: string }

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/

const baseSchema = z.object({
  term: z.coerce.number().int().refine((n) => n === 1 || n === 2, "Dönem 1 veya 2 olmalı."),
  day_of_week: z.coerce.number().int().min(1).max(7),
  start_time: z.string().regex(timeRegex, "Saat HH:MM formatında olmalı."),
  end_time: z.string().regex(timeRegex, "Saat HH:MM formatında olmalı."),
  subject_id: z
    .string()
    .uuid()
    .nullish()
    .transform((v) => v ?? null),
  custom_title: z
    .string()
    .trim()
    .max(120)
    .nullish()
    .transform((v) => (v && v.length > 0 ? v : null)),
  notes: z
    .string()
    .trim()
    .max(500)
    .nullish()
    .transform((v) => (v && v.length > 0 ? v : null)),
})

const createSchema = baseSchema
  .refine((d) => d.subject_id || d.custom_title, {
    message: "Ders seç veya özel başlık gir.",
    path: ["subject_id"],
  })
  .refine((d) => d.end_time > d.start_time, {
    message: "Bitiş saati başlangıçtan sonra olmalı.",
    path: ["end_time"],
  })

async function requireCoachOwnership(studentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
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

/** Aynı öğrenci + dönem + gün üzerinde başka satırla zaman çakışması var mı? */
async function checkConflict(
  supabase: Awaited<ReturnType<typeof createClient>>,
  args: {
    studentId: string
    term: number
    day_of_week: number
    start_time: string
    end_time: string
    excludeId?: string
  },
): Promise<boolean> {
  let q = supabase
    .from("schedule")
    .select("id, start_time, end_time")
    .eq("student_id", args.studentId)
    .eq("term", args.term)
    .eq("day_of_week", args.day_of_week)
    .lt("start_time", args.end_time)
    .gt("end_time", args.start_time)

  if (args.excludeId) q = q.neq("id", args.excludeId)

  const { data } = await q
  return (data?.length ?? 0) > 0
}

export async function createScheduleEntry(
  studentId: string,
  input: unknown,
): Promise<Result> {
  const auth = await requireCoachOwnership(studentId)
  if (!auth.ok) return { success: false, error: auth.error }

  const parsed = createSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Form hatalı." }
  }

  const conflict = await checkConflict(auth.supabase, {
    studentId,
    term: parsed.data.term,
    day_of_week: parsed.data.day_of_week,
    start_time: parsed.data.start_time,
    end_time: parsed.data.end_time,
  })
  if (conflict) {
    return { success: false, error: "Bu gün ve saat aralığında başka bir ders var." }
  }

  const { error } = await auth.supabase.from("schedule").insert({
    student_id: studentId,
    term: parsed.data.term,
    day_of_week: parsed.data.day_of_week,
    start_time: parsed.data.start_time,
    end_time: parsed.data.end_time,
    subject_id: parsed.data.subject_id,
    custom_title: parsed.data.custom_title,
    notes: parsed.data.notes,
  })

  if (error) {
    console.error("Program ekleme hatası:", error)
    return { success: false, error: "Program eklenemedi, tekrar deneyin." }
  }

  revalidatePath(`/koc/ogrenciler/${studentId}/program`)
  revalidatePath(`/mudur/ogrenciler/${studentId}/program`)
  return { success: true }
}

export async function updateScheduleEntry(
  studentId: string,
  entryId: string,
  input: unknown,
): Promise<Result> {
  const auth = await requireCoachOwnership(studentId)
  if (!auth.ok) return { success: false, error: auth.error }

  const parsed = createSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Form hatalı." }
  }

  const conflict = await checkConflict(auth.supabase, {
    studentId,
    term: parsed.data.term,
    day_of_week: parsed.data.day_of_week,
    start_time: parsed.data.start_time,
    end_time: parsed.data.end_time,
    excludeId: entryId,
  })
  if (conflict) {
    return { success: false, error: "Bu gün ve saat aralığında başka bir ders var." }
  }

  const { error } = await auth.supabase
    .from("schedule")
    .update({
      term: parsed.data.term,
      day_of_week: parsed.data.day_of_week,
      start_time: parsed.data.start_time,
      end_time: parsed.data.end_time,
      subject_id: parsed.data.subject_id,
      custom_title: parsed.data.custom_title,
      notes: parsed.data.notes,
    })
    .eq("id", entryId)
    .eq("student_id", studentId)

  if (error) {
    console.error("Program güncelleme hatası:", error)
    return { success: false, error: "Güncellenemedi, tekrar deneyin." }
  }

  revalidatePath(`/koc/ogrenciler/${studentId}/program`)
  revalidatePath(`/mudur/ogrenciler/${studentId}/program`)
  return { success: true }
}

export async function deleteScheduleEntry(
  studentId: string,
  entryId: string,
): Promise<Result> {
  const auth = await requireCoachOwnership(studentId)
  if (!auth.ok) return { success: false, error: auth.error }

  const { error } = await auth.supabase
    .from("schedule")
    .delete()
    .eq("id", entryId)
    .eq("student_id", studentId)

  if (error) {
    console.error("Program silme hatası:", error)
    return { success: false, error: "Silinemedi, tekrar deneyin." }
  }

  revalidatePath(`/koc/ogrenciler/${studentId}/program`)
  revalidatePath(`/mudur/ogrenciler/${studentId}/program`)
  return { success: true }
}
