"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const sessionSchema = z.object({
  subject_id: z.string().uuid("Ders seçilmedi."),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Geçerli bir tarih girin."),
  correct: z.number().int().min(0),
  wrong: z.number().int().min(0),
  empty: z.number().int().min(0),
  duration_minutes: z.number().int().min(0).nullable().optional(),
  resource_id: z.string().uuid().nullable().optional(),
})

function n(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim()
  if (s === "") return null
  const num = Number(s)
  return Number.isFinite(num) ? Math.floor(num) : null
}

export async function createSessionAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Oturum bulunamadı." }

  const resourceRaw = String(formData.get("resource_id") ?? "").trim()
  const parsed = sessionSchema.safeParse({
    subject_id: String(formData.get("subject_id") ?? "").trim(),
    date: String(formData.get("date") ?? "").trim(),
    correct: n(formData.get("correct")) ?? 0,
    wrong: n(formData.get("wrong")) ?? 0,
    empty: n(formData.get("empty")) ?? 0,
    duration_minutes: n(formData.get("duration_minutes")),
    resource_id: resourceRaw === "" ? null : resourceRaw,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Form hatalı." }
  }

  const data = parsed.data
  const total = data.correct + data.wrong + data.empty
  if (total <= 0) return { error: "En az 1 soru girmelisin." }

  const { error } = await supabase.from("study_sessions").insert({
    student_id: user.id,
    created_by: user.id,
    subject_id: data.subject_id,
    date: data.date,
    correct: data.correct,
    wrong: data.wrong,
    empty: data.empty,
    total_questions: total,
    duration_minutes: data.duration_minutes ?? null,
    resource_id: data.resource_id ?? null,
  })

  if (error) return { error: error.message }

  revalidatePath("/ogrenci/soru-cozum")
  revalidatePath("/ogrenci")
  redirect("/ogrenci/soru-cozum")
}

export async function deleteSessionAction(sessionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Oturum bulunamadı." }

  const { error } = await supabase
    .from("study_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("student_id", user.id)

  if (error) return { error: error.message }

  revalidatePath("/ogrenci/soru-cozum")
  revalidatePath("/ogrenci")
  return { ok: true }
}
