"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { DURUM_VALUES, KURUM_TIPI_VALUES } from "@/lib/satis-takibi"

type ActionResult = { success: boolean; error?: string }

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: "Yetkisiz işlem." }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()
  if (profile?.role !== "admin") return { ok: false as const, error: "Yetkisiz işlem." }
  return { ok: true as const }
}

// Boş string -> null, aksi halde trimlenmiş metin.
const optionalText = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => (v ? v : null))

// "" veya null -> null; geçerli tarih (YYYY-MM-DD) ise korunur.
const optionalDate = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => (v ? v : null))
  .refine(
    (v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v),
    "Geçersiz tarih.",
  )

const leadSchema = z.object({
  kurum_adi: z.string().trim().min(2, "Kurum adı en az 2 karakter."),
  kurum_tipi: z.enum(KURUM_TIPI_VALUES),
  il: optionalText,
  ilce: optionalText,
  iletisim_kisisi: optionalText,
  telefon: optionalText,
  ogrenci_sayisi: z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .transform((v) => {
      if (v === null || v === undefined || v === "") return null
      const n = typeof v === "string" ? Number(v) : v
      return Number.isFinite(n) ? Math.trunc(n) : null
    })
    .refine((v) => v === null || (v >= 0 && v <= 1000000), "Geçersiz öğrenci sayısı."),
  durum: z.enum(DURUM_VALUES),
  verilen_fiyat: optionalText,
  son_temas_tarihi: optionalDate,
  sonraki_adim: optionalText,
  sonraki_adim_tarihi: optionalDate,
  notlar: optionalText,
})

export async function createLead(input: unknown): Promise<ActionResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, error: auth.error }

  const parsed = leadSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Form hatalı." }
  }

  const admin = supabaseAdmin()
  const { error } = await admin.from("sales_leads").insert(parsed.data)

  if (error) {
    console.error("Satış kaydı oluşturma hatası:", error)
    return { success: false, error: "Kayıt oluşturulamadı." }
  }

  revalidatePath("/mudur/satis-takibi")
  return { success: true }
}

export async function updateLead(id: string, input: unknown): Promise<ActionResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, error: auth.error }

  if (!id) return { success: false, error: "Kayıt bulunamadı." }

  const parsed = leadSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Form hatalı." }
  }

  const admin = supabaseAdmin()
  const { error } = await admin.from("sales_leads").update(parsed.data).eq("id", id)

  if (error) {
    console.error("Satış kaydı güncelleme hatası:", error)
    return { success: false, error: "Kayıt güncellenemedi." }
  }

  revalidatePath("/mudur/satis-takibi")
  return { success: true }
}

export async function deleteLead(id: string): Promise<ActionResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, error: auth.error }

  if (!id) return { success: false, error: "Kayıt bulunamadı." }

  const admin = supabaseAdmin()
  const { error } = await admin.from("sales_leads").delete().eq("id", id)

  if (error) {
    console.error("Satış kaydı silme hatası:", error)
    return { success: false, error: "Kayıt silinemedi." }
  }

  revalidatePath("/mudur/satis-takibi")
  return { success: true }
}
