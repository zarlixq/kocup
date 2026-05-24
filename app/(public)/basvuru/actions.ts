"use server"

import { createClient } from "@/lib/supabase/server"
import { z } from "zod"

const BasvuruSchema = z.object({
  full_name: z.string().min(2, "Ad Soyad en az 2 karakter olmalı"),
  email: z.string().email("Geçerli bir e-posta girin"),
  phone: z.string().min(10, "Geçerli bir telefon girin"),
  grade: z.enum(["7", "8", "9", "10", "11", "12", "Mezun"], { message: "Sınıf seçin" }),
  target_university: z.string().optional(),
  target_department: z.string().optional(),
  target_ranking: z.coerce.number().int().positive().optional().or(z.literal("")),
  parent_name: z.string().min(2, "Veli adı en az 2 karakter olmalı"),
  parent_phone: z.string().min(10, "Geçerli bir veli telefonu girin"),
})

type BasvuruResult =
  | { success: true }
  | { success: false; error: string }

export async function submitBasvuru(
  _prev: unknown,
  formData: FormData
): Promise<BasvuruResult> {
  const raw = {
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    grade: formData.get("grade"),
    target_university: formData.get("target_university") || undefined,
    target_department: formData.get("target_department") || undefined,
    target_ranking: formData.get("target_ranking") || undefined,
    parent_name: formData.get("parent_name"),
    parent_phone: formData.get("parent_phone"),
  }

  const parsed = BasvuruSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const { target_ranking, ...rest } = parsed.data

  const supabase = await createClient()
  const { error } = await supabase.from("applications").insert({
    ...rest,
    target_ranking: target_ranking === "" || target_ranking === undefined ? null : Number(target_ranking),
  })

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Bu e-posta ile zaten bir başvuru mevcut." }
    }
    console.error("Başvuru hatası:", error)
    return { success: false, error: "Bir hata oluştu, tekrar deneyin." }
  }

  return { success: true }
}
