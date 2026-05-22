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

export async function createPaymentAction(studentId: string, formData: FormData) {
  const supabase = await createClient()
  const package_id = s(formData.get("package_id"))
  const amount = n(formData.get("amount"))
  const payment_date = s(formData.get("payment_date"))
  const period_month = s(formData.get("period_month")) // YYYY-MM-01
  const method = s(formData.get("method"))

  if (!package_id) return { error: "Paket seçilmedi." }
  if (amount === null || amount <= 0) return { error: "Geçerli bir tutar girin." }
  if (!payment_date) return { error: "Ödeme tarihi zorunlu." }
  if (!period_month) return { error: "Hangi ayın ödemesi olduğunu seçin." }

  const { error } = await supabase.from("payments").insert({
    student_id: studentId,
    package_id,
    amount,
    payment_date,
    period_month,
    method,
    notes: s(formData.get("notes")),
  })

  if (error) return { error: error.message }

  revalidatePath(`/admin/ogrenciler/${studentId}`)
  revalidatePath("/admin/odemeler")
  revalidatePath("/admin")
  return { ok: true }
}

export async function deletePaymentAction(paymentId: string) {
  const supabase = await createClient()
  const { data } = await supabase.from("payments").select("student_id").eq("id", paymentId).maybeSingle()
  const { error } = await supabase.from("payments").delete().eq("id", paymentId)
  if (error) return { error: error.message }
  if (data?.student_id) revalidatePath(`/admin/ogrenciler/${data.student_id}`)
  revalidatePath("/admin/odemeler")
  revalidatePath("/admin")
  return { ok: true }
}
