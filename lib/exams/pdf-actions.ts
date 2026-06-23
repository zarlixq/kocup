"use server"

import { createClient } from "@/lib/supabase/server"

/**
 * Bir denemenin PDF'i için kısa ömürlü signed URL üretir.
 * Erişim kontrolü exams tablosunun RLS'ine devredilir
 * (öğrenci kendi + koçu + admin görebilir).
 */
export async function getExamPdfSignedUrl(
  examId: string,
): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Oturum bulunamadı." }

  const { data: exam } = await supabase
    .from("exams")
    .select("pdf_path")
    .eq("id", examId)
    .maybeSingle()

  if (!exam?.pdf_path) return { error: "Bu deneme için PDF bulunamadı." }

  const { data, error } = await supabase.storage
    .from("exam-pdfs")
    .createSignedUrl(exam.pdf_path, 60)

  if (error || !data?.signedUrl) {
    return { error: error?.message ?? "PDF bağlantısı oluşturulamadı." }
  }
  return { url: data.signedUrl }
}

/**
 * Client-side storage upload'ı tamamlandıktan sonra exams.pdf_path'i kaydeder.
 * Sadece exam_id + path string alır (dosya DEĞİL) → Server Action gövde limiti
 * devreye girmez. Yetki exams RLS'ine devredilir; path beklenen şemaya zorlanır.
 */
export async function setExamPdfPath(
  examId: string,
  path: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Oturum bulunamadı." }

  // RLS ile görünür mü + path doğru şemada mı ({student_id}/{exam_id}.pdf)
  const { data: exam } = await supabase
    .from("exams")
    .select("student_id")
    .eq("id", examId)
    .maybeSingle()
  if (!exam) return { success: false, error: "Deneme bulunamadı." }

  const expected = `${exam.student_id}/${examId}.pdf`
  if (path !== expected) return { success: false, error: "Geçersiz dosya yolu." }

  const { error } = await supabase.from("exams").update({ pdf_path: path }).eq("id", examId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}
