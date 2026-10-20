"use server"

import { randomUUID } from "crypto"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { checkRateLimit, RATE_LIMIT_MESSAGE } from "@/lib/security/rate-limit"

type Result = { success: boolean; error?: string }

const MAX_BYTES = 4 * 1024 * 1024
const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" }

const schema = z.object({
  message: z.string().trim().min(3, "Ne olduğunu kısaca yaz.").max(2000, "En fazla 2000 karakter."),
  page_path: z
    .string()
    .max(300)
    .optional()
    .nullable()
    .transform((v) => (v && v.startsWith("/") ? v : null)),
})

/** Öğrenci geri bildirimi: kayıt oturum client'ıyla (RLS), görüntü service role ile private bucket'a. */
export async function submitFeedbackAction(formData: FormData): Promise<Result> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Oturum bulunamadı." }

  const parsed = schema.safeParse({ message: formData.get("message"), page_path: formData.get("page_path") })
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Form hatalı." }

  const file = formData.get("screenshot")
  const hasFile = file instanceof File && file.size > 0
  if (hasFile) {
    if (!EXT[file.type]) return { success: false, error: "Ekran görüntüsü PNG, JPG veya WEBP olmalı." }
    if (file.size > MAX_BYTES) return { success: false, error: "Ekran görüntüsü en fazla 4 MB olabilir." }
  }

  if (!(await checkRateLimit("feedbackUser", user.id))) return { success: false, error: RATE_LIMIT_MESSAGE }

  const { data: row, error } = await supabase
    .from("feedback")
    .insert({ user_id: user.id, message: parsed.data.message, page_path: parsed.data.page_path })
    .select("id")
    .single()
  if (error || !row) {
    console.error("feedback insert:", error)
    return { success: false, error: "Bir hata oluştu, tekrar deneyin." }
  }

  if (hasFile) {
    const admin = supabaseAdmin()
    const path = `${user.id}/${randomUUID()}.${EXT[file.type]}`
    const { error: upErr } = await admin.storage.from("feedback").upload(path, file, { contentType: file.type })
    if (upErr) {
      console.error("feedback upload:", upErr)
      return { success: true, error: "Geri bildirimin kaydedildi ama ekran görüntüsü yüklenemedi." }
    }
    await admin.from("feedback").update({ screenshot_path: path }).eq("id", row.id)
  }

  return { success: true }
}
