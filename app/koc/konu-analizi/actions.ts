"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import type { TablesInsert, TablesUpdate } from "@/lib/database.types"

type ActionResult<T = undefined> = { success: boolean; error?: string; data?: T }

const createSchema = z.object({
  student_id: z.string().uuid(),
  topic_id: z.string().uuid(),
  hedef_soru: z.number().int().positive("Hedef soru sayısı pozitif olmalı"),
  hedef_sure_dk: z.number().int().positive().nullable().optional(),
  baslangic_tarihi: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  son_tarih: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(2000).nullable().optional(),
})

export type CreateAssignmentInput = z.input<typeof createSchema>

async function getAuthedCoach() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Oturum bulunamadı")
  return { supabase, userId: user.id }
}

export async function createAssignment(input: CreateAssignmentInput): Promise<ActionResult<{ id: string }>> {
  const parsed = createSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Geçersiz veri" }
  }
  const data = parsed.data
  const { supabase, userId } = await getAuthedCoach()

  // Öğrencinin koçu olduğumuzu doğrula
  const { data: student } = await supabase
    .from("students")
    .select("id, coach_id")
    .eq("id", data.student_id)
    .maybeSingle()
  if (!student || student.coach_id !== userId) {
    return { success: false, error: "Bu öğrenciyi atamak için yetkiniz yok" }
  }

  const row: TablesInsert<"topic_assignments"> = {
    coach_id: userId,
    student_id: data.student_id,
    topic_id: data.topic_id,
    hedef_soru: data.hedef_soru,
    hedef_sure_dk: data.hedef_sure_dk ?? null,
    baslangic_tarihi: data.baslangic_tarihi ?? new Date().toISOString().slice(0, 10),
    son_tarih: data.son_tarih,
    notes: data.notes ?? null,
    created_by: userId,
  }

  const { data: ins, error } = await supabase
    .from("topic_assignments")
    .insert(row)
    .select("id")
    .single()

  if (error || !ins) return { success: false, error: error?.message ?? "Atama oluşturulamadı" }

  revalidatePath("/koc/konu-analizi")
  revalidatePath(`/koc/ogrenciler/${data.student_id}/konu-analizi`)
  revalidatePath("/koc")
  revalidatePath("/ogrenci")
  revalidatePath("/ogrenci/konularim")
  return { success: true, data: { id: ins.id } }
}

const updateSchema = z.object({
  id: z.string().uuid(),
  hedef_soru: z.number().int().positive().optional(),
  hedef_sure_dk: z.number().int().positive().nullable().optional(),
  son_tarih: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().max(2000).nullable().optional(),
  status: z.enum(["aktif", "tamamlandi", "iptal"]).optional(),
})

export type UpdateAssignmentInput = z.input<typeof updateSchema>

export async function updateAssignment(input: UpdateAssignmentInput): Promise<ActionResult> {
  const parsed = updateSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Geçersiz veri" }
  }
  const data = parsed.data
  const { supabase, userId } = await getAuthedCoach()

  const { data: existing } = await supabase
    .from("topic_assignments")
    .select("id, coach_id, student_id")
    .eq("id", data.id)
    .maybeSingle()
  if (!existing) return { success: false, error: "Atama bulunamadı" }
  if (existing.coach_id !== userId) return { success: false, error: "Yetkiniz yok" }

  const changes: TablesUpdate<"topic_assignments"> = {}
  if (data.hedef_soru !== undefined) changes.hedef_soru = data.hedef_soru
  if (data.hedef_sure_dk !== undefined) changes.hedef_sure_dk = data.hedef_sure_dk
  if (data.son_tarih !== undefined) changes.son_tarih = data.son_tarih
  if (data.notes !== undefined) changes.notes = data.notes
  if (data.status !== undefined) changes.status = data.status

  if (Object.keys(changes).length === 0) return { success: true }

  const { error } = await supabase.from("topic_assignments").update(changes).eq("id", data.id)
  if (error) return { success: false, error: error.message }

  revalidatePath("/koc/konu-analizi")
  revalidatePath(`/koc/ogrenciler/${existing.student_id}/konu-analizi`)
  revalidatePath("/ogrenci")
  revalidatePath("/ogrenci/konularim")
  return { success: true }
}

export async function deleteAssignment(id: string): Promise<ActionResult> {
  const { supabase, userId } = await getAuthedCoach()

  const { data: existing } = await supabase
    .from("topic_assignments")
    .select("id, coach_id, student_id")
    .eq("id", id)
    .maybeSingle()
  if (!existing) return { success: false, error: "Atama bulunamadı" }
  if (existing.coach_id !== userId) return { success: false, error: "Yetkiniz yok" }

  const { error } = await supabase.from("topic_assignments").delete().eq("id", id)
  if (error) return { success: false, error: error.message }

  revalidatePath("/koc/konu-analizi")
  revalidatePath(`/koc/ogrenciler/${existing.student_id}/konu-analizi`)
  revalidatePath("/ogrenci")
  revalidatePath("/ogrenci/konularim")
  return { success: true }
}

const bulkSchema = z.object({
  student_ids: z.array(z.string().uuid()).min(1, "En az bir öğrenci seçin"),
  topic_ids: z.array(z.string().uuid()).min(1, "En az bir konu seçin"),
  hedef_soru: z.number().int().positive(),
  hedef_sure_dk: z.number().int().positive().nullable().optional(),
  son_tarih: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(2000).nullable().optional(),
})

export type BulkAssignInput = z.input<typeof bulkSchema>

export async function bulkAssign(input: BulkAssignInput): Promise<ActionResult<{ created: number }>> {
  const parsed = bulkSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Geçersiz veri" }
  }
  const data = parsed.data
  const { supabase, userId } = await getAuthedCoach()

  // Sadece bu koçun öğrencileri olanları filtrele
  const { data: ownStudents } = await supabase
    .from("students")
    .select("id")
    .eq("coach_id", userId)
    .in("id", data.student_ids)
  const allowedStudentIds = (ownStudents ?? []).map((s) => s.id)
  if (allowedStudentIds.length === 0) {
    return { success: false, error: "Hiçbir öğrenci üzerinde yetkiniz yok" }
  }

  const today = new Date().toISOString().slice(0, 10)
  const rows: TablesInsert<"topic_assignments">[] = []
  for (const sid of allowedStudentIds) {
    for (const tid of data.topic_ids) {
      rows.push({
        coach_id: userId,
        student_id: sid,
        topic_id: tid,
        hedef_soru: data.hedef_soru,
        hedef_sure_dk: data.hedef_sure_dk ?? null,
        baslangic_tarihi: today,
        son_tarih: data.son_tarih,
        notes: data.notes ?? null,
        created_by: userId,
      })
    }
  }

  const { error } = await supabase.from("topic_assignments").insert(rows)
  if (error) return { success: false, error: error.message }

  revalidatePath("/koc/konu-analizi")
  revalidatePath("/koc")
  revalidatePath("/ogrenci")
  revalidatePath("/ogrenci/konularim")
  return { success: true, data: { created: rows.length } }
}
