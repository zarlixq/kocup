"use server"

import { createClient } from "@/lib/supabase/server"
import { z } from "zod"

const InquirySchema = z.object({
  institution_name: z.string().trim().min(2, "Dershane adı en az 2 karakter olmalı"),
  city: z.string().trim().min(2, "İl seçin"),
  full_name: z.string().trim().min(2, "Yetkili adı en az 2 karakter olmalı"),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+()\s-]{10,17}$/, "Geçerli bir telefon numarası girin"),
  email: z.union([z.string().trim().email("Geçerli bir e-posta girin"), z.literal("")]),
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
    city: formData.get("city"),
    full_name: formData.get("full_name"),
    phone: formData.get("phone"),
    email: formData.get("email") ?? "",
    kvkk: formData.get("kvkk") ?? "",
  }

  const parsed = InquirySchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const d = parsed.data
  const supabase = await createClient()
  const { error } = await supabase.from("institution_inquiries").insert({
    institution_name: d.institution_name,
    city: d.city,
    full_name: d.full_name,
    phone: d.phone,
    email: d.email.trim() ? d.email.trim() : null,
    // status ('new') ve created_at (now()) DB default'larına bırakılıyor.
  })

  if (error) {
    console.error("Kurum talebi hatası:", error)
    return { success: false, error: "Bir hata oluştu, lütfen tekrar deneyin." }
  }

  return { success: true }
}
