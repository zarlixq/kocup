"use server"

import { createClient } from "@/lib/supabase/server"
import { z } from "zod"

const KocBasvuruSchema = z.object({
  ad_soyad: z.string().trim().min(2, "Ad Soyad en az 2 karakter olmalı"),
  telefon: z.string().trim().min(10, "Geçerli bir telefon girin"),
  email: z.union([z.string().trim().email("Geçerli bir e-posta girin"), z.literal("")]),
  brans: z.string().trim().max(80).optional().or(z.literal("")),
  deneyim_yili: z.coerce.number().int().min(0).max(60).optional().or(z.literal("")),
  cv_url: z.union([z.string().trim().url("Geçerli bir bağlantı girin"), z.literal("")]),
  mesaj: z.string().trim().max(2000).optional().or(z.literal("")),
  kvkk: z.literal("on", { message: "Devam etmek için KVKK onayı gerekli." }),
})

type KocBasvuruResult =
  | { success: true }
  | { success: false; error: string }

export async function submitKocBasvuru(
  _prev: unknown,
  formData: FormData
): Promise<KocBasvuruResult> {
  const raw = {
    ad_soyad: formData.get("ad_soyad"),
    telefon: formData.get("telefon"),
    email: formData.get("email") ?? "",
    brans: formData.get("brans") ?? "",
    deneyim_yili: formData.get("deneyim_yili") || "",
    cv_url: formData.get("cv_url") ?? "",
    mesaj: formData.get("mesaj") ?? "",
    kvkk: formData.get("kvkk") ?? "",
  }

  const parsed = KocBasvuruSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const d = parsed.data
  const nullIfEmpty = (v: string | undefined) => (v && v.trim() ? v.trim() : null)

  const supabase = await createClient()
  const { error } = await supabase.from("koc_applications").insert({
    ad_soyad: d.ad_soyad,
    telefon: d.telefon,
    email: nullIfEmpty(d.email),
    brans: nullIfEmpty(d.brans),
    deneyim_yili: d.deneyim_yili === "" || d.deneyim_yili === undefined ? null : Number(d.deneyim_yili),
    cv_url: nullIfEmpty(d.cv_url),
    mesaj: nullIfEmpty(d.mesaj),
    // status ('yeni') ve created_at (now()) DB default'larına bırakılıyor.
  })

  if (error) {
    console.error("Koç başvurusu hatası:", error)
    return { success: false, error: "Bir hata oluştu, lütfen tekrar deneyin." }
  }

  return { success: true }
}
