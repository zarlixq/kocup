"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { inviteStudent } from "@/lib/auth/invite"

function s(v: FormDataEntryValue | null) {
  const str = String(v ?? "").trim()
  return str === "" ? null : str
}

const inviteSchema = z.object({
  email: z.string().email("Geçerli bir email girin."),
  full_name: z.string().trim().min(2, "Ad soyad en az 2 karakter olmalı."),
  phone: z.string().trim().optional().nullable(),
  grade: z.enum(["9", "10", "11", "12", "Mezun"]).optional().nullable(),
  school: z.string().trim().optional().nullable(),
  parent_name: z.string().trim().optional().nullable(),
  parent_phone: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
})

export async function inviteStudentAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Oturum bulunamadı." }

  const parsed = inviteSchema.safeParse({
    email: String(formData.get("email") ?? "").trim(),
    full_name: String(formData.get("full_name") ?? "").trim(),
    phone: s(formData.get("phone")),
    grade: s(formData.get("grade")),
    school: s(formData.get("school")),
    parent_name: s(formData.get("parent_name")),
    parent_phone: s(formData.get("parent_phone")),
    notes: s(formData.get("notes")),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Form hatalı." }
  }

  const data = parsed.data

  try {
    const invitedUser = await inviteStudent({
      email: data.email,
      full_name: data.full_name,
      phone: data.phone,
      grade: data.grade ?? undefined,
      parent_name: data.parent_name,
      parent_phone: data.parent_phone,
    })

    const admin = supabaseAdmin()

    // profiles trigger ile otomatik oluşur (handle_new_user). students elle eklenir.
    const { error: stuErr } = await admin.from("students").insert({
      id: invitedUser.id,
      coach_id: user.id,
      kayit_kaynagi: "koc_ekledi",
      grade: data.grade ?? null,
      school: data.school,
      parent_name: data.parent_name,
      parent_phone: data.parent_phone,
      notes: data.notes,
      is_active: true,
    })

    if (stuErr) {
      console.error("Öğrenci satırı oluşturma hatası:", stuErr)
      return { error: "Davet gönderildi ama öğrenci kaydı oluşturulamadı." }
    }

    revalidatePath("/koc/ogrenciler")
    revalidatePath("/koc")
  } catch (err) {
    console.error("Öğrenci davet hatası:", err)
    const message = err instanceof Error ? err.message : "Bir hata oluştu."
    return { error: message }
  }

  redirect("/koc/ogrenciler")
}

export async function updateStudentAction(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Oturum bulunamadı." }

  const full_name = s(formData.get("full_name"))
  if (!full_name) return { error: "Ad soyad zorunlu." }

  const admin = supabaseAdmin()

  // profiles: full_name, phone
  const { error: pErr } = await admin
    .from("profiles")
    .update({
      full_name,
      phone: s(formData.get("phone")),
    })
    .eq("id", id)

  if (pErr) return { error: pErr.message }

  // students: school, grade, parent_*, notes
  const { error: sErr } = await supabase
    .from("students")
    .update({
      grade: s(formData.get("grade")),
      school: s(formData.get("school")),
      parent_name: s(formData.get("parent_name")),
      parent_phone: s(formData.get("parent_phone")),
      notes: s(formData.get("notes")),
    })
    .eq("id", id)

  if (sErr) return { error: sErr.message }

  revalidatePath("/koc/ogrenciler")
  revalidatePath(`/koc/ogrenciler/${id}`)
  redirect(`/koc/ogrenciler/${id}`)
}

export async function toggleStudentActiveAction(id: string, nextValue: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.from("students").update({ is_active: nextValue }).eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/koc/ogrenciler")
  revalidatePath(`/koc/ogrenciler/${id}`)
  revalidatePath("/koc")
  return { ok: true }
}

export async function deleteStudentAction(id: string) {
  // Auth user'ı sil → cascade ile profiles + students + bağımlı veriler silinir
  const admin = supabaseAdmin()
  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) return { error: error.message }
  revalidatePath("/koc/ogrenciler")
  revalidatePath("/koc")
  redirect("/koc/ogrenciler")
}
