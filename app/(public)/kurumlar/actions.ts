"use server"

import { createClient } from "@/lib/supabase/server"
import { z } from "zod"

const InquirySchema = z.object({
  institution_name: z.string().trim().min(2, "Kurum adı en az 2 karakter olmalı"),
  full_name: z.string().trim().min(2, "Ad Soyad en az 2 karakter olmalı"),
  phone: z.string().trim().min(10, "Geçerli bir telefon girin"),
  email: z.union([z.string().trim().email("Geçerli bir e-posta girin"), z.literal("")]),
  student_count: z.string().trim().max(20).optional().or(z.literal("")),
  coach_count: z.string().trim().max(20).optional().or(z.literal("")),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
  kvkk: z.literal("on", { message: "Devam etmek için KVKK onayı gerekli." }),
})

type InquiryResult =
  | { success: true }
  | { success: false; error: string }

export async function submitInstitutionInquiry(
  _prev: unknown,
  formData: FormData
): Promise<InquiryResult> {
  const raw = {
    institution_name: formData.get("institution_name"),
    full_name: formData.get("full_name"),
    phone: formData.get("phone"),
    email: formData.get("email") ?? "",
    student_count: formData.get("student_count") ?? "",
    coach_count: formData.get("coach_count") ?? "",
    message: formData.get("message") ?? "",
    kvkk: formData.get("kvkk") ?? "",
  }

  const parsed = InquirySchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const d = parsed.data
  const nullIfEmpty = (v: string | undefined) => (v && v.trim() ? v.trim() : null)

  const supabase = await createClient()
  const { error } = await supabase.from("institution_inquiries").insert({
    institution_name: d.institution_name,
    full_name: d.full_name,
    phone: d.phone,
    email: nullIfEmpty(d.email),
    student_count: nullIfEmpty(d.student_count),
    coach_count: nullIfEmpty(d.coach_count),
    message: nullIfEmpty(d.message),
    // status ('new') ve created_at (now()) DB default'larına bırakılıyor.
  })

  if (error) {
    console.error("Kurum talebi hatası:", error)
    return { success: false, error: "Bir hata oluştu, lütfen tekrar deneyin." }
  }

  return { success: true }
}
