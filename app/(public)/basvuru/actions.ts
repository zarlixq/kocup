"use server"

import { createClient } from "@/lib/supabase/server"
import { z } from "zod"

const LGS_GRADES = ["5", "6", "7", "8"] as const
const YKS_GRADES = ["9", "10", "11", "12", "Mezun"] as const

const BasvuruSchema = z
  .object({
    full_name: z.string().min(2, "Ad Soyad en az 2 karakter olmalı"),
    email: z.string().email("Geçerli bir e-posta girin"),
    phone: z.string().min(10, "Geçerli bir telefon girin"),
    grade: z.enum(["5", "6", "7", "8", "9", "10", "11", "12", "Mezun"], {
      message: "Sınıf seçin",
    }),
    // Opsiyonel: segment seçilmezse eski (tek form) davranış korunur.
    segment: z.enum(["lgs", "yks"]).optional(),
    target_university: z.string().optional(),
    target_department: z.string().optional(),
    target_ranking: z.coerce.number().int().positive().optional().or(z.literal("")),
    parent_name: z.string().min(2, "Veli adı en az 2 karakter olmalı"),
    parent_phone: z.string().min(10, "Geçerli bir veli telefonu girin"),
    kvkk: z.literal("on", { message: "Devam etmek için KVKK açık rıza onayı gerekli." }),
  })
  .superRefine((data, ctx) => {
    // Segment seçildiyse sınıf o segmente uygun olmalı (defansif sunucu kontrolü).
    if (data.segment === "lgs" && !LGS_GRADES.includes(data.grade as (typeof LGS_GRADES)[number])) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["grade"], message: "LGS için sınıf 5-8 olmalı" })
    }
    if (data.segment === "yks" && !YKS_GRADES.includes(data.grade as (typeof YKS_GRADES)[number])) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["grade"],
        message: "YKS için sınıf 9-12 veya Mezun olmalı",
      })
    }
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
    segment: formData.get("segment") || undefined,
    target_university: formData.get("target_university") || undefined,
    target_department: formData.get("target_department") || undefined,
    target_ranking: formData.get("target_ranking") || undefined,
    parent_name: formData.get("parent_name"),
    parent_phone: formData.get("parent_phone"),
    kvkk: formData.get("kvkk") ?? "",
  }

  const parsed = BasvuruSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  // kvkk yalnızca onay kutusudur; applications tablosunda kolonu yok, insert'e dahil edilmez.
  const { target_ranking, segment, kvkk: _kvkk, ...rest } = parsed.data

  const supabase = await createClient()
  const { error } = await supabase.from("applications").insert({
    ...rest,
    target_ranking: target_ranking === "" || target_ranking === undefined ? null : Number(target_ranking),
    // segment yalnızca seçildiyse gönderilir (kolon yoksa eski akış bozulmaz).
    ...(segment ? { segment } : {}),
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
