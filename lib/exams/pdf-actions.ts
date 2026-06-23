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
