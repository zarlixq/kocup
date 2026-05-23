"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

function s(v: FormDataEntryValue | null) {
  const str = String(v ?? "").trim()
  return str === "" ? null : str
}

export async function createStudentAction(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Oturum bulunamadı." }

  const full_name = s(formData.get("full_name"))
  if (!full_name) return { error: "Ad soyad zorunlu." }

  const { data, error } = await supabase
    .from("clients")
    .insert({
      coach_id: user.id,
      full_name,
      phone: s(formData.get("phone")),
      parent_name: s(formData.get("parent_name")),
      parent_phone: s(formData.get("parent_phone")),
      school: s(formData.get("school")),
      grade: s(formData.get("grade")),
      notes: s(formData.get("notes")),
    })
    .select("id")
    .single()

  if (error) return { error: error.message }

  revalidatePath("/admin/ogrenciler")
  revalidatePath("/admin")
  redirect(`/admin/ogrenciler/${data.id}`)
}

export async function updateStudentAction(id: string, formData: FormData) {
  const supabase = await createClient()
  const full_name = s(formData.get("full_name"))
  if (!full_name) return { error: "Ad soyad zorunlu." }

  const { error } = await supabase
    .from("clients")
    .update({
      full_name,
      phone: s(formData.get("phone")),
      parent_name: s(formData.get("parent_name")),
      parent_phone: s(formData.get("parent_phone")),
      school: s(formData.get("school")),
      grade: s(formData.get("grade")),
      notes: s(formData.get("notes")),
    })
    .eq("id", id)

  if (error) return { error: error.message }

  revalidatePath("/admin/ogrenciler")
  revalidatePath(`/admin/ogrenciler/${id}`)
  redirect(`/admin/ogrenciler/${id}`)
}

export async function toggleStudentActiveAction(id: string, nextValue: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.from("clients").update({ is_active: nextValue }).eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/admin/ogrenciler")
  revalidatePath(`/admin/ogrenciler/${id}`)
  revalidatePath("/admin")
  return { ok: true }
}

export async function deleteStudentAction(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("clients").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/admin/ogrenciler")
  revalidatePath("/admin")
  redirect("/admin/ogrenciler")
}
