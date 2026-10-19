"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { ERROR_TYPES } from "@/lib/yanlis-defteri/constants"
import { loadOverconfident } from "@/lib/upplan/load"
import type { OverconfidentTopic } from "@/lib/upplan/today"

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
  return createExam(input, "")
}

// UpPlan kurulumundan gelen deneme: yanlış paneli bitince kuruluma döner.
export async function createExamFromUpplanAction(input: unknown) {
  return createExam(input, "&from=upplan")
}

async function createExam(input: unknown, redirectSuffix: string) {
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
  // Detay sayfası yanlış panelini açık getirir (yanlışlar konulara dağıtılsın).
  return {
    examId: exam.id,
    studentId: user.id,
    redirectTo: `/ogrenci/denemelerim/${exam.id}?yanlislar=1${redirectSuffix}`,
  }
}

export async function updateExamAction(examId: string, input: unknown) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Oturum bulunamadı." }

  const parsed = examSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Form hatalı." }
  }

  const { name, exam_type, date, siralama, notes, results } = parsed.data
  const nonZero = results.filter((r) => r.correct + r.wrong + r.empty > 0)
  if (nonZero.length === 0) {
    return { error: "En az bir ders için sonuç girmelisin." }
  }

  const { data: exam } = await supabase
    .from("exams")
    .select("id")
    .eq("id", examId)
    .eq("student_id", user.id)
    .maybeSingle()
  if (!exam) return { error: "Deneme bulunamadı." }

  // exams + exam_results tek transaction'da (migration 199); RLS geçerli.
  const { error } = await supabase.rpc("update_exam_with_results", {
    p_exam_id: examId,
    p_name: name,
    p_exam_type: exam_type,
    p_date: date,
    p_siralama: siralama ?? undefined,
    p_notes: notes ?? undefined,
    p_results: nonZero,
  })

  if (error) {
    console.error("updateExamAction", error)
    return { error: "Deneme güncellenemedi, tekrar dene." }
  }

  revalidatePath("/ogrenci/denemelerim")
  revalidatePath(`/ogrenci/denemelerim/${examId}`)
  revalidatePath("/ogrenci")
  revalidatePath(`/koc/ogrenciler/${user.id}/denemeler`)
  return {
    examId,
    studentId: user.id,
    redirectTo: `/ogrenci/denemelerim/${examId}`,
  }
}

export async function deleteExamAction(examId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Oturum bulunamadı." }

  // .select() → RLS 0 satır etkilerse sessizce "başarılı" dönmesin.
  const { data, error } = await supabase
    .from("exams")
    .delete()
    .eq("id", examId)
    .eq("student_id", user.id)
    .select("pdf_path")

  if (error) {
    console.error("deleteExamAction", error)
    return { error: "Deneme silinemedi, tekrar dene." }
  }
  if (!data || data.length === 0) return { error: "Deneme bulunamadı." }

  // PDF best-effort: storage hatası silme işlemini geri almaz.
  const pdfPath = data[0].pdf_path
  if (pdfPath) {
    const { error: rmErr } = await supabase.storage.from("exam-pdfs").remove([pdfPath])
    if (rmErr) console.error("deleteExamAction pdf", rmErr)
  }

  revalidatePath("/ogrenci/denemelerim")
  revalidatePath("/ogrenci")
  revalidatePath(`/koc/ogrenciler/${user.id}/denemeler`)
  redirect("/ogrenci/denemelerim")
}

// ─────────────────────────────────────────────────────────────────────────
// Deneme → yanlış defteri (migration 208)
// ─────────────────────────────────────────────────────────────────────────

const examWrongItemsSchema = z
  .array(
    z.object({
      topic_id: z.string().uuid(),
      error_type: z.enum(ERROR_TYPES).nullable(),
      knowledge_atom_id: z.string().uuid().nullable(),
      count: z.number().int().min(0).max(200),
    }),
  )
  .max(500)

type ExamWrongsResult = { success: boolean; error?: string; data?: { overconfident: OverconfidentTopic[] } }

// DB'nin Türkçe iş kuralı mesajları (RPC raise / CHECK) kullanıcıya gösterilir.
function dbMessage(error: { code?: string; message: string }, fallback: string) {
  if (error.code === "23514" || error.code === "23503" || error.code === "P0001") return error.message
  return fallback
}

export async function saveExamWrongsAction(examId: string, items: unknown): Promise<ExamWrongsResult> {
  try {
    if (!z.string().uuid().safeParse(examId).success) return { success: false, error: "Deneme bulunamadı." }
    const parsed = examWrongItemsSchema.safeParse(items)
    if (!parsed.success) return { success: false, error: "Geçersiz yanlış listesi." }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Oturum bulunamadı." }

    // Uzlaştırma tek transaction'da; ustalık skoru trigger'la güncellenir.
    const { error } = await supabase.rpc("set_exam_wrong_answers", { p_exam_id: examId, p_items: parsed.data })
    if (error) {
      console.error("saveExamWrongsAction", error)
      return { success: false, error: dbMessage(error, "Yanlışlar kaydedilemedi, tekrar dene.") }
    }

    // "Biliyorum" dediği ama bu denemeden sonra skoru eşik altına düşen konular.
    const topicIds = new Set(parsed.data.filter((i) => i.count > 0).map((i) => i.topic_id))
    const overconfident = (await loadOverconfident(supabase, user.id)).filter((t) => topicIds.has(t.topic_id))

    revalidatePath(`/ogrenci/denemelerim/${examId}`)
    revalidatePath("/ogrenci")
    revalidatePath("/ogrenci/upplan")
    revalidatePath("/ogrenci/yanlis-defteri")
    revalidatePath(`/koc/ogrenciler/${user.id}/upplan`)
    revalidatePath(`/koc/ogrenciler/${user.id}/acik-haritasi`)
    return { success: true, data: { overconfident } }
  } catch (e) {
    console.error("saveExamWrongsAction", e)
    return { success: false, error: "Bir hata oluştu, tekrar deneyin." }
  }
}
