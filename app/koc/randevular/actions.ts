"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { expandRecurrence, type RecurrenceRule } from "@/lib/appointments/recurrence"
import type { AppointmentType } from "@/lib/appointments/constants"

type ActionResult<T = undefined> = {
  success: boolean
  error?: string
  data?: T
  conflict?: {
    id: string
    title: string
    start_time: string
    end_time: string
  }
}

const baseSchema = z.object({
  title: z.string().min(1, "Başlık gerekli").max(200),
  type: z.enum(["tanitim", "koc_gorusme", "veli_gorusme", "ozel"]),
  student_id: z.string().uuid().nullable().optional(),
  application_id: z.string().uuid().nullable().optional(),
  start_time: z.string().min(1),
  end_time: z.string().min(1),
  meeting_link: z.string().url("Geçerli bir link girin").or(z.literal("")).optional(),
  notes: z.string().max(2000).optional(),
  is_recurring: z.boolean().default(false),
  recurrence_rule: z.enum(["weekly", "biweekly"]).nullable().optional(),
  recurrence_end_date: z.string().nullable().optional(),
  force: z.boolean().default(false),
})

export type CreateAppointmentInput = z.input<typeof baseSchema>

async function getAuthedCoach() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Oturum bulunamadı")
  return { supabase, userId: user.id }
}

/**
 * Aynı koç için verilen aralıkta çakışan iptal/edilmemiş randevu var mı?
 * excludeId verilirse o satırı hariç tutar (güncelleme için).
 */
async function findConflict(
  supabase: Awaited<ReturnType<typeof createClient>>,
  coachId: string,
  startIso: string,
  endIso: string,
  excludeId?: string,
) {
  let query = supabase
    .from("appointments")
    .select("id, title, start_time, end_time")
    .eq("coach_id", coachId)
    .neq("status", "iptal")
    .lt("start_time", endIso)
    .gt("end_time", startIso)
    .limit(1)
  if (excludeId) query = query.neq("id", excludeId)
  const { data } = await query.maybeSingle()
  return data ?? null
}

export async function createAppointment(input: CreateAppointmentInput): Promise<ActionResult<{ id: string }>> {
  const parsed = baseSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Geçersiz veri" }
  }
  const data = parsed.data
  const { supabase, userId } = await getAuthedCoach()

  const startDate = new Date(data.start_time)
  const endDate = new Date(data.end_time)
  if (endDate <= startDate) {
    return { success: false, error: "Bitiş saati başlangıçtan sonra olmalı" }
  }

  // Çakışma kontrolü (force=false ise)
  if (!data.force) {
    const conflict = await findConflict(
      supabase,
      userId,
      startDate.toISOString(),
      endDate.toISOString(),
    )
    if (conflict) {
      return {
        success: false,
        error: "Bu saatte zaten bir randevunuz var",
        conflict: {
          id: conflict.id,
          title: conflict.title,
          start_time: conflict.start_time,
          end_time: conflict.end_time,
        },
      }
    }
  }

  // Tekrarlama doğrulaması
  if (data.is_recurring && (!data.recurrence_rule || !data.recurrence_end_date)) {
    return {
      success: false,
      error: "Tekrarlama için kural ve bitiş tarihi gerekli",
    }
  }

  // Parent insert
  const meeting_link = data.meeting_link?.trim() || null
  const baseRow = {
    coach_id: userId,
    student_id: data.student_id ?? null,
    application_id: data.application_id ?? null,
    title: data.title,
    type: data.type as AppointmentType,
    start_time: startDate.toISOString(),
    end_time: endDate.toISOString(),
    is_recurring: data.is_recurring,
    recurrence_rule: data.is_recurring ? data.recurrence_rule : null,
    recurrence_end_date: data.is_recurring ? data.recurrence_end_date : null,
    meeting_link,
    notes: data.notes?.trim() || null,
    created_by: userId,
  }

  const { data: parent, error: parentErr } = await supabase
    .from("appointments")
    .insert(baseRow)
    .select("id")
    .single()

  if (parentErr || !parent) {
    return { success: false, error: parentErr?.message ?? "Randevu oluşturulamadı" }
  }

  // Tekrarlanan child'lar
  if (data.is_recurring && data.recurrence_rule && data.recurrence_end_date) {
    const children = expandRecurrence(
      startDate,
      endDate,
      data.recurrence_rule as RecurrenceRule,
      new Date(data.recurrence_end_date),
    )

    if (children.length > 0) {
      const rows = children.map((c) => ({
        ...baseRow,
        start_time: c.start_time.toISOString(),
        end_time: c.end_time.toISOString(),
        parent_appointment_id: parent.id,
      }))
      const { error: childErr } = await supabase.from("appointments").insert(rows)
      if (childErr) {
        // parent silmeyi düşünebiliriz; şimdilik uyar
        return {
          success: false,
          error: `Ana randevu oluşturuldu ama tekrarlar eklenemedi: ${childErr.message}`,
        }
      }
    }
  }

  revalidatePath("/koc/randevular")
  revalidatePath("/koc")
  revalidatePath("/ogrenci/randevularim")
  revalidatePath("/ogrenci")
  revalidatePath("/mudur/randevular")
  return { success: true, data: { id: parent.id } }
}

const updateSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  type: z.enum(["tanitim", "koc_gorusme", "veli_gorusme", "ozel"]).optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  meeting_link: z.string().url().or(z.literal("")).optional(),
  notes: z.string().max(2000).optional(),
  status: z.enum(["planlandi", "tamamlandi", "iptal", "gelmedi"]).optional(),
  summary: z.string().max(2000).optional(),
  scope: z.enum(["one", "series"]).default("one"),
  force: z.boolean().default(false),
})

export type UpdateAppointmentInput = z.input<typeof updateSchema>

export async function updateAppointment(input: UpdateAppointmentInput): Promise<ActionResult> {
  const parsed = updateSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Geçersiz veri" }
  }
  const data = parsed.data
  const { supabase, userId } = await getAuthedCoach()

  // Hedef randevuyu çek
  const { data: target } = await supabase
    .from("appointments")
    .select("id, coach_id, parent_appointment_id, start_time, end_time")
    .eq("id", data.id)
    .maybeSingle()

  if (!target) return { success: false, error: "Randevu bulunamadı" }
  if (target.coach_id !== userId) return { success: false, error: "Yetkiniz yok" }

  const changes: Record<string, unknown> = {}
  if (data.title !== undefined) changes.title = data.title
  if (data.type !== undefined) changes.type = data.type
  if (data.notes !== undefined) changes.notes = data.notes.trim() || null
  if (data.meeting_link !== undefined) changes.meeting_link = data.meeting_link.trim() || null
  if (data.status !== undefined) changes.status = data.status
  if (data.summary !== undefined) changes.summary = data.summary.trim() || null

  // Zaman güncellendiyse çakışma kontrolü
  if (data.start_time && data.end_time) {
    const s = new Date(data.start_time)
    const e = new Date(data.end_time)
    if (e <= s) return { success: false, error: "Bitiş saati başlangıçtan sonra olmalı" }
    if (!data.force) {
      const conflict = await findConflict(supabase, userId, s.toISOString(), e.toISOString(), data.id)
      if (conflict) {
        return {
          success: false,
          error: "Bu saatte zaten bir randevunuz var",
          conflict: {
            id: conflict.id,
            title: conflict.title,
            start_time: conflict.start_time,
            end_time: conflict.end_time,
          },
        }
      }
    }
    changes.start_time = s.toISOString()
    changes.end_time = e.toISOString()
  }

  if (Object.keys(changes).length === 0) {
    return { success: true }
  }

  // Scope=series: parent_id'yi belirle, tüm seriyi güncelle
  if (data.scope === "series") {
    const parentId = target.parent_appointment_id ?? target.id

    // Seri güncellenirken zaman değiştirme tehlikeli (her child'a aynı saatte set etmek anlamsız).
    // Bu yüzden series scope ise start/end değişikliğini her satıra aynı şekilde uygulamıyoruz;
    // diğer alanlar (title, type, notes, link, status, summary) tüm seriye uygulanır.
    const seriesChanges = { ...changes }
    delete seriesChanges.start_time
    delete seriesChanges.end_time

    // Parent'ı güncelle
    const { error: e1 } = await supabase
      .from("appointments")
      .update(seriesChanges)
      .eq("id", parentId)
    if (e1) return { success: false, error: e1.message }

    // Tüm child'ları güncelle
    const { error: e2 } = await supabase
      .from("appointments")
      .update(seriesChanges)
      .eq("parent_appointment_id", parentId)
    if (e2) return { success: false, error: e2.message }
  } else {
    const { error } = await supabase
      .from("appointments")
      .update(changes)
      .eq("id", data.id)
    if (error) return { success: false, error: error.message }
  }

  revalidatePath("/koc/randevular")
  revalidatePath("/koc")
  revalidatePath("/ogrenci/randevularim")
  revalidatePath("/ogrenci")
  revalidatePath("/mudur/randevular")
  return { success: true }
}

export async function deleteAppointment(
  id: string,
  scope: "one" | "series" = "one",
): Promise<ActionResult> {
  const { supabase, userId } = await getAuthedCoach()

  const { data: target } = await supabase
    .from("appointments")
    .select("id, coach_id, parent_appointment_id")
    .eq("id", id)
    .maybeSingle()

  if (!target) return { success: false, error: "Randevu bulunamadı" }
  if (target.coach_id !== userId) return { success: false, error: "Yetkiniz yok" }

  if (scope === "series") {
    const parentId = target.parent_appointment_id ?? target.id
    // Parent silindiğinde child'lar CASCADE silinir
    const { error } = await supabase.from("appointments").delete().eq("id", parentId)
    if (error) return { success: false, error: error.message }
  } else {
    const { error } = await supabase.from("appointments").delete().eq("id", id)
    if (error) return { success: false, error: error.message }
  }

  revalidatePath("/koc/randevular")
  revalidatePath("/koc")
  revalidatePath("/ogrenci/randevularim")
  revalidatePath("/ogrenci")
  revalidatePath("/mudur/randevular")
  return { success: true }
}

export async function markCompleted(id: string, summary?: string): Promise<ActionResult> {
  return updateAppointment({ id, status: "tamamlandi", summary })
}

export async function cancelAppointment(id: string, scope: "one" | "series" = "one"): Promise<ActionResult> {
  return updateAppointment({ id, status: "iptal", scope })
}
