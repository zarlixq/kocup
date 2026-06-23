"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const resultSchema = z.object({
  subject_id: z.string().uuid(),
  correct: z.number().int().min(0),
  wrong: z.number().int().min(0),
  empty: z.number().int().min(0),
})

const examSchema = z.object({
  name: z.string().trim().min(2, "Deneme adı zorunlu."),
  exam_type: z.enum(["tyt", "ayt", "tyt_ayt", "lgs", "okul"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Geçerli bir tarih girin."),
  siralama: z.number().int().positive().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  results: z.array(resultSchema).min(1, "En az bir ders sonucu girmelisin."),
})

export type CreateExamInput = z.infer<typeof examSchema>

export async function createExamAction(input: unknown) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Oturum bulunamadı." }

  const parsed = examSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Form hatalı." }
  }

  const { name, exam_type, date, siralama, notes, results } = parsed.data

  // Sıfır olan tüm satırları at — sadece girilen ders sonuçlarını sakla
  const nonZero = results.filter((r) => r.correct + r.wrong + r.empty > 0)
  if (nonZero.length === 0) {
    return { error: "En az bir ders için sonuç girmelisin." }
  }

  const { data: exam, error: examErr } = await supabase
    .from("exams")
    .insert({
      student_id: user.id,
      created_by: user.id,
      name,
      exam_type,
      date,
      siralama: siralama ?? null,
      notes: notes ?? null,
    })
    .select("id")
    .single()

  if (examErr || !exam) {
    return { error: examErr?.message ?? "Deneme oluşturulamadı." }
  }

  const { error: resErr } = await supabase.from("exam_results").insert(
    nonZero.map((r) => ({
      exam_id: exam.id,
      subject_id: r.subject_id,
      correct: r.correct,
      wrong: r.wrong,
      empty: r.empty,
    }))
  )

  if (resErr) {
    // Rollback (best effort)
    await supabase.from("exams").delete().eq("id", exam.id)
    return { error: resErr.message }
  }

  revalidatePath("/ogrenci/denemelerim")
  revalidatePath("/ogrenci")
  // PDF (varsa) client tarafında storage'a yüklenir; yönlendirmeyi client yapar.
  return {
    examId: exam.id,
    studentId: user.id,
    redirectTo: `/ogrenci/denemelerim/${exam.id}`,
  }
}

export async function deleteExamAction(examId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Oturum bulunamadı." }

  const { error } = await supabase
    .from("exams")
    .delete()
    .eq("id", examId)
    .eq("student_id", user.id)

  if (error) return { error: error.message }

  revalidatePath("/ogrenci/denemelerim")
  revalidatePath("/ogrenci")
  redirect("/ogrenci/denemelerim")
}
