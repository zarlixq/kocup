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

async function requireCoachOf(studentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: "Oturum bulunamadı." }
  const { data: student } = await supabase
    .from("students")
    .select("coach_id")
    .eq("id", studentId)
    .maybeSingle()
  if (!student || student.coach_id !== user.id) {
    return { ok: false as const, error: "Bu öğrenciye erişim yetkin yok." }
  }
  return { ok: true as const, userId: user.id, supabase }
}

export async function createExamForStudentAction(studentId: string, input: unknown) {
  const auth = await requireCoachOf(studentId)
  if (!auth.ok) return { error: auth.error }

  const parsed = examSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Form hatalı." }
  }

  // PDF examSchema'nın dışında — ayrıca okunur (zod bilinmeyen anahtarları yok sayar)
  const pdfFile = (input as { pdfFile?: File | null } | null)?.pdfFile ?? null

  const { name, exam_type, date, siralama, notes, results } = parsed.data
  const nonZero = results.filter((r) => r.correct + r.wrong + r.empty > 0)
  if (nonZero.length === 0) {
    return { error: "En az bir ders için sonuç girmelisin." }
  }

  const { data: exam, error: examErr } = await auth.supabase
    .from("exams")
    .insert({
      student_id: studentId,
      created_by: auth.userId,
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

  const { error: resErr } = await auth.supabase.from("exam_results").insert(
    nonZero.map((r) => ({
      exam_id: exam.id,
      subject_id: r.subject_id,
      correct: r.correct,
      wrong: r.wrong,
      empty: r.empty,
    }))
  )

  if (resErr) {
    await auth.supabase.from("exams").delete().eq("id", exam.id)
    return { error: resErr.message }
  }

  // PDF best-effort: yükleme hatası denemeyi silmez, sadece loglanır.
  if (pdfFile && pdfFile.size > 0) {
    const path = `${studentId}/${exam.id}.pdf`
    const { error: upErr } = await auth.supabase.storage
      .from("exam-pdfs")
      .upload(path, pdfFile, { contentType: "application/pdf", upsert: true })
    if (upErr) {
      console.error("Deneme PDF yüklenemedi:", upErr.message)
    } else {
      await auth.supabase.from("exams").update({ pdf_path: path }).eq("id", exam.id)
    }
  }

  revalidatePath(`/koc/ogrenciler/${studentId}/denemeler`)
  revalidatePath(`/koc/ogrenciler/${studentId}`)
  redirect(`/koc/ogrenciler/${studentId}/denemeler`)
}

export async function deleteExamForStudentAction(studentId: string, examId: string) {
  const auth = await requireCoachOf(studentId)
  if (!auth.ok) return { error: auth.error }

  const { error } = await auth.supabase
    .from("exams")
    .delete()
    .eq("id", examId)
    .eq("student_id", studentId)

  if (error) return { error: error.message }
  revalidatePath(`/koc/ogrenciler/${studentId}/denemeler`)
  return { ok: true }
}
