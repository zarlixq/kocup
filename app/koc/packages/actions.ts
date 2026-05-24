"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

function n(v: FormDataEntryValue | null) {
  const s = String(v ?? "").replace(",", ".").trim()
  if (s === "") return null
  const num = Number(s)
  return Number.isFinite(num) ? num : null
}

function s(v: FormDataEntryValue | null) {
  const str = String(v ?? "").trim()
  return str === "" ? null : str
}

export async function createPackageAction(studentId: string, formData: FormData) {
  const supabase = await createClient()
  const name = s(formData.get("name"))
  const monthly_price = n(formData.get("monthly_price"))
  const start_date = s(formData.get("start_date"))
  const end_date = s(formData.get("end_date"))
  const payment_day = n(formData.get("payment_day"))

  if (!name) return { error: "Paket adı zorunlu." }
  if (monthly_price === null || monthly_price < 0) return { error: "Geçerli bir aylık ücret girin." }
  if (!start_date) return { error: "Başlangıç tarihi zorunlu." }

  const { error } = await supabase.from("packages").insert({
    student_id: studentId,
    name,
    monthly_price,
    start_date,
    end_date,
    payment_day: payment_day ? Math.min(Math.max(payment_day, 1), 31) : 1,
    status: "active",
    notes: s(formData.get("notes")),
  })

  if (error) return { error: error.message }

  revalidatePath(`/koc/ogrenciler/${studentId}`)
  revalidatePath(`/koc/ogrenciler/${studentId}/odemeler`)
  revalidatePath("/koc/packages")
  revalidatePath("/koc")
  return { ok: true }
}

export async function updatePackageAction(packageId: string, studentId: string, formData: FormData) {
  const supabase = await createClient()
  const name = s(formData.get("name"))
  const monthly_price = n(formData.get("monthly_price"))
  const start_date = s(formData.get("start_date"))
  const end_date = s(formData.get("end_date"))
  const payment_day = n(formData.get("payment_day"))
  const status = s(formData.get("status")) ?? "active"

  if (!name) return { error: "Paket adı zorunlu." }
  if (monthly_price === null || monthly_price < 0) return { error: "Geçerli bir aylık ücret girin." }
  if (!start_date) return { error: "Başlangıç tarihi zorunlu." }

  const { error } = await supabase
    .from("packages")
    .update({
      name,
      monthly_price,
      start_date,
      end_date,
      payment_day: payment_day ? Math.min(Math.max(payment_day, 1), 31) : 1,
      status,
      notes: s(formData.get("notes")),
    })
    .eq("id", packageId)

  if (error) return { error: error.message }

  revalidatePath(`/koc/ogrenciler/${studentId}`)
  revalidatePath(`/koc/ogrenciler/${studentId}/odemeler`)
  revalidatePath("/koc/packages")
  revalidatePath("/koc")
  return { ok: true }
}

export async function endPackageAction(packageId: string, studentId: string) {
  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)
  const { error } = await supabase
    .from("packages")
    .update({ status: "ended", end_date: today })
    .eq("id", packageId)
  if (error) return { error: error.message }
  revalidatePath(`/koc/ogrenciler/${studentId}`)
  revalidatePath(`/koc/ogrenciler/${studentId}/odemeler`)
  revalidatePath("/koc/packages")
  revalidatePath("/koc")
  return { ok: true }
}
