"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { DURUM_VALUES, KURUM_TIPI_VALUES, DEMO_OUTCOME_VALUES } from "@/lib/satis-takibi"

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
  return { ok: true as const, userId: user.id }
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

// ─────────────────────────────────────────────────────────────────────────
// DEMO RANDEVULARI (demo_appointments) — koç-öğrenci appointments'tan AYRI
// ─────────────────────────────────────────────────────────────────────────

// Istanbul yerel tarih+saat → UTC instant. lib/tz.ts IST_OFFSET '+03:00'
// konvansiyonu (DST yok). scheduled_at timestamptz olarak saklanır.
function istanbulScheduledAt(date: string, time: string): string {
  return new Date(`${date}T${time}:00+03:00`).toISOString()
}

const optionalUuid = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => (v ? v : null))
  .refine(
    (v) => v === null || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v),
    "Geçersiz seçim.",
  )

const demoCreateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Geçerli bir tarih seçin."),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Geçerli bir saat girin (SS:DD)."),
  notes: optionalText,
  set_by_id: optionalUuid,
})

function revalidateDemo(leadId: string) {
  revalidatePath(`/mudur/satis-takibi/${leadId}`)
  revalidatePath("/mudur/satis-takibi")
  revalidatePath("/mudur")
}

export async function createDemoAppointment(leadId: string, input: unknown): Promise<ActionResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, error: auth.error }
  if (!leadId) return { success: false, error: "Kurum bulunamadı." }

  const parsed = demoCreateSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Form hatalı." }
  }

  const admin = supabaseAdmin()
  const { error } = await admin.from("demo_appointments").insert({
    lead_id: leadId,
    scheduled_at: istanbulScheduledAt(parsed.data.date, parsed.data.time),
    status: "scheduled",
    notes: parsed.data.notes,
    set_by_id: parsed.data.set_by_id,
    created_by: auth.userId,
  })

  if (error) {
    console.error("Demo randevu oluşturma hatası:", error)
    return { success: false, error: "Randevu oluşturulamadı." }
  }

  revalidateDemo(leadId)
  return { success: true }
}

const demoResultSchema = z.object({
  showed_up: z.boolean(),
  outcome: z.enum(DEMO_OUTCOME_VALUES).optional().nullable(),
  notes: optionalText,
})

// Geldi/gelmedi işaretle. Geldi → completed (+opsiyonel sonuç), gelmedi → no_show.
export async function markDemoResult(id: string, input: unknown): Promise<ActionResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, error: auth.error }
  if (!id) return { success: false, error: "Randevu bulunamadı." }

  const parsed = demoResultSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Form hatalı." }
  }

  const admin = supabaseAdmin()
  const update = parsed.data.showed_up
    ? {
        showed_up: true,
        status: "completed" as const,
        outcome: parsed.data.outcome ?? null,
        ...(parsed.data.notes !== null ? { notes: parsed.data.notes } : {}),
      }
    : {
        showed_up: false,
        status: "no_show" as const,
        ...(parsed.data.notes !== null ? { notes: parsed.data.notes } : {}),
      }

  const { data, error } = await admin
    .from("demo_appointments")
    .update(update)
    .eq("id", id)
    .select("lead_id")
    .maybeSingle()

  if (error || !data) {
    console.error("Demo randevu sonuç hatası:", error)
    return { success: false, error: "İşlem başarısız." }
  }

  revalidateDemo(data.lead_id)
  return { success: true }
}

// Not güncelle (her durumda düzenlenebilir).
export async function updateDemoNotes(id: string, notes: string): Promise<ActionResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, error: auth.error }
  if (!id) return { success: false, error: "Randevu bulunamadı." }

  const admin = supabaseAdmin()
  const { data, error } = await admin
    .from("demo_appointments")
    .update({ notes: notes.trim() ? notes.trim() : null })
    .eq("id", id)
    .select("lead_id")
    .maybeSingle()

  if (error || !data) {
    console.error("Demo not güncelleme hatası:", error)
    return { success: false, error: "Not kaydedilemedi." }
  }

  revalidateDemo(data.lead_id)
  return { success: true }
}

// Yeniden randevu: eski randevu 'rescheduled' olur (SİLİNMEZ), yeni satır zincirle bağlanır.
export async function rescheduleDemoAppointment(oldId: string, input: unknown): Promise<ActionResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, error: auth.error }
  if (!oldId) return { success: false, error: "Randevu bulunamadı." }

  const parsed = demoCreateSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Form hatalı." }
  }

  const admin = supabaseAdmin()
  const { data: old, error: oldErr } = await admin
    .from("demo_appointments")
    .select("id, lead_id, status")
    .eq("id", oldId)
    .maybeSingle()

  if (oldErr || !old) {
    return { success: false, error: "Eski randevu bulunamadı." }
  }

  // Eski randevuyu ertelendi işaretle (geçmiş korunur)
  const { error: updErr } = await admin
    .from("demo_appointments")
    .update({ status: "rescheduled" })
    .eq("id", oldId)
  if (updErr) {
    console.error("Eski randevu erteleme hatası:", updErr)
    return { success: false, error: "İşlem başarısız." }
  }

  // Yeni randevu — zincir bağı rescheduled_from_id ile
  const { error: insErr } = await admin.from("demo_appointments").insert({
    lead_id: old.lead_id,
    scheduled_at: istanbulScheduledAt(parsed.data.date, parsed.data.time),
    status: "scheduled",
    notes: parsed.data.notes,
    set_by_id: parsed.data.set_by_id,
    rescheduled_from_id: oldId,
    created_by: auth.userId,
  })
  if (insErr) {
    console.error("Yeni randevu oluşturma hatası:", insErr)
    return { success: false, error: "Yeni randevu oluşturulamadı." }
  }

  revalidateDemo(old.lead_id)
  return { success: true }
}

// Planlı randevuyu iptal et (geçmiş korunur, silinmez).
export async function cancelDemoAppointment(id: string): Promise<ActionResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, error: auth.error }
  if (!id) return { success: false, error: "Randevu bulunamadı." }

  const admin = supabaseAdmin()
  const { data, error } = await admin
    .from("demo_appointments")
    .update({ status: "cancelled" })
    .eq("id", id)
    .select("lead_id")
    .maybeSingle()

  if (error || !data) {
    console.error("Demo randevu iptal hatası:", error)
    return { success: false, error: "İptal edilemedi." }
  }

  revalidateDemo(data.lead_id)
  return { success: true }
}

// ── Demo ayarlayan (setter) kataloğu ─────────────────────────────────────

// Yeni ayarlayan ekle (creatable select içinden). Aynı isim varsa (case-insensitive)
// yeni satır AÇMAZ, mevcut olanı döndürür (unique koruması). Soft-inactive ise aktifleştirir.
export async function createDemoSetter(
  name: string,
): Promise<{ success: boolean; error?: string; data?: { id: string; name: string } }> {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, error: auth.error }

  const clean = name.trim()
  if (clean.length < 2) return { success: false, error: "İsim en az 2 karakter olmalı." }

  const admin = supabaseAdmin()

  // Mevcut (case-insensitive) varsa onu kullan — mükerrer önlenir.
  const { data: existing } = await admin
    .from("demo_setters")
    .select("id, name, is_active")
    .ilike("name", clean)
    .maybeSingle()

  if (existing) {
    if (!existing.is_active) {
      await admin.from("demo_setters").update({ is_active: true }).eq("id", existing.id)
    }
    revalidatePath("/mudur/satis-takibi")
    return { success: true, data: { id: existing.id, name: existing.name } }
  }

  const { data, error } = await admin
    .from("demo_setters")
    .insert({ name: clean, created_by: auth.userId })
    .select("id, name")
    .single()

  if (error || !data) {
    console.error("Ayarlayan ekleme hatası:", error)
    return { success: false, error: "Ayarlayan eklenemedi." }
  }

  revalidatePath("/mudur/satis-takibi")
  return { success: true, data }
}

// Var olan randevunun ayarlayanını değiştir (null = temizle).
export async function setDemoAppointmentSetter(
  id: string,
  setterId: string | null,
): Promise<ActionResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, error: auth.error }
  if (!id) return { success: false, error: "Randevu bulunamadı." }

  const admin = supabaseAdmin()
  const { data, error } = await admin
    .from("demo_appointments")
    .update({ set_by_id: setterId })
    .eq("id", id)
    .select("lead_id")
    .maybeSingle()

  if (error || !data) {
    console.error("Ayarlayan atama hatası:", error)
    return { success: false, error: "Ayarlayan güncellenemedi." }
  }

  revalidateDemo(data.lead_id)
  return { success: true }
}

// Lead durumunu tek alanla değiştir (ör. takip listesinden "Kaybedildi işaretle").
export async function setLeadDurum(id: string, durum: string): Promise<ActionResult> {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, error: auth.error }
  if (!id) return { success: false, error: "Kurum bulunamadı." }

  const parsedDurum = z.enum(DURUM_VALUES).safeParse(durum)
  if (!parsedDurum.success) return { success: false, error: "Geçersiz durum." }

  const admin = supabaseAdmin()
  const { error } = await admin
    .from("sales_leads")
    .update({ durum: parsedDurum.data })
    .eq("id", id)

  if (error) {
    console.error("Lead durum güncelleme hatası:", error)
    return { success: false, error: "Durum güncellenemedi." }
  }

  revalidatePath("/mudur/satis-takibi")
  revalidatePath(`/mudur/satis-takibi/${id}`)
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
