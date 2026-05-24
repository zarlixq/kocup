"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const schema = z.object({
  full_name: z.string().trim().min(2, "Ad soyad zorunlu."),
  phone: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  bio: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  certificate_info: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  years_experience: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === "" || v === null) return null
      const n = Number(v)
      return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null
    }),
  specialties: z
    .string()
    .trim()
    .optional()
    .transform((v) => {
      if (!v) return null
      return v
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    }),
})

export async function updateMyCoachProfile(input: unknown) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Oturum bulunamadı." }

  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Form hatalı." }
  }

  const { full_name, phone, bio, certificate_info, years_experience, specialties } = parsed.data

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name,
      phone,
      bio,
      certificate_info,
      years_experience,
      specialties,
    })
    .eq("id", user.id)

  if (error) return { success: false, error: error.message }
  revalidatePath("/koc/profilim")
  revalidatePath("/koc/ayarlar")
  revalidatePath("/")
  return { success: true }
}
