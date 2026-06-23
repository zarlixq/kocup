"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { RESOURCE_TYPES, RESOURCE_STATUSES } from "@/lib/resources/constants"

type Result = { success: boolean; error?: string }

/**
 * Öğrenci-kaynak işlemlerini yapan aktörün yetkisini doğrular.
 * Öğrenci kendisi için, koç kendi öğrencisi için, admin herkes için işlem yapar.
 */
async function getActor(studentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: "Oturum bulunamadı." }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", user.id)
    .maybeSingle()
  const role = profile?.role

  let addedBy: "student" | "coach"
  if (user.id === studentId && role === "student") {
    addedBy = "student"
  } else if (role === "coach") {
    const { data: st } = await supabase
      .from("students")
      .select("coach_id")
      .eq("id", studentId)
      .maybeSingle()
    if (!st || st.coach_id !== user.id) {
      return { ok: false as const, error: "Bu öğrenciye erişim yetkin yok." }
    }
    addedBy = "coach"
  } else if (role === "admin") {
    addedBy = "coach"
  } else {
    return { ok: false as const, error: "Yetkisiz işlem." }
  }

  return {
    ok: true as const,
    supabase,
    userId: user.id,
    orgId: profile?.organization_id ?? null,
    addedBy,
  }
}

function revalidate(studentId: string) {
  revalidatePath("/ogrenci/kaynaklarim")
  revalidatePath(`/koc/ogrenciler/${studentId}/kaynaklar`)
}

/** Katalogdaki bir kaynağı öğrenciye ata. */
export async function addCatalogResource(
  studentId: string,
  resourceId: string,
): Promise<Result> {
  const actor = await getActor(studentId)
  if (!actor.ok) return { success: false, error: actor.error }

  if (!z.string().uuid().safeParse(resourceId).success) {
    return { success: false, error: "Geçersiz kaynak." }
  }

  // Kaynağın çağırana görünür (RLS) olduğunu doğrula — başka kuruma ait gizli
  // bir kaynak UUID'si ile bağ kurulmasını engelle. RLS-kapsamlı client kullan.
  const { data: visible } = await actor.supabase
    .from("resources")
    .select("id")
    .eq("id", resourceId)
    .maybeSingle()
  if (!visible) return { success: false, error: "Kaynak bulunamadı." }

  const { error } = await actor.supabase.from("student_resources").insert({
    student_id: studentId,
    resource_id: resourceId,
    added_by: actor.addedBy,
  })

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Bu kaynak zaten ekli." }
    }
    console.error("Kaynak atama hatası:", error)
    return { success: false, error: "Kaynak eklenemedi, tekrar deneyin." }
  }

  revalidate(studentId)
  return { success: true }
}

const customSchema = z.object({
  name: z.string().trim().min(2, "Kaynak adı en az 2 karakter."),
  publisher: z.string().trim().max(120).nullish().transform((v) => (v && v.length > 0 ? v : null)),
  subject_id: z.string().uuid().nullish().transform((v) => v ?? null),
  type: z.enum(RESOURCE_TYPES),
  total_questions: z.number().int().min(0).nullable().optional(),
})

/** Katalogda olmayan bir kaynağı serbest girip öğrenciye ata (is_custom=true). */
export async function addCustomResource(
  studentId: string,
  input: unknown,
): Promise<Result> {
  const actor = await getActor(studentId)
  if (!actor.ok) return { success: false, error: actor.error }

  const parsed = customSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Form hatalı." }
  }

  const name = parsed.data.name.trim()
  const subjectId = parsed.data.subject_id

  // Dedup: aynı ders + ad (trim, case-insensitive) ile görünür bir kaynak zaten
  // varsa yenisini oluşturma, mevcudunu kullan (RLS-kapsamlı client → kullanıcının
  // org'u + ortak katalog ile sınırlı). Katalog kirlenmesini önler.
  let resourceId: string | null = null
  {
    let q = actor.supabase.from("resources").select("id, name")
    q = subjectId ? q.eq("subject_id", subjectId) : q.is("subject_id", null)
    const { data: candidates } = await q
    const target = name.toLocaleLowerCase("tr")
    resourceId =
      (candidates ?? []).find((c) => c.name.trim().toLocaleLowerCase("tr") === target)?.id ?? null
  }

  if (!resourceId) {
    // Katalog yazma RLS yok → custom kayıt service-role ile eklenir.
    // org_id ve created_by oturumdan zorlanır; client'a güvenilmez.
    const admin = supabaseAdmin()
    const { data: resource, error: resErr } = await admin
      .from("resources")
      .insert({
        name,
        publisher: parsed.data.publisher,
        subject_id: subjectId,
        type: parsed.data.type,
        total_questions: parsed.data.total_questions ?? null,
        org_id: actor.orgId,
        is_custom: true,
        created_by: actor.userId,
      })
      .select("id")
      .single()

    if (resErr || !resource) {
      console.error("Custom kaynak ekleme hatası:", resErr)
      return { success: false, error: "Kaynak oluşturulamadı." }
    }
    resourceId = resource.id
  }

  const { error: linkErr } = await actor.supabase.from("student_resources").insert({
    student_id: studentId,
    resource_id: resourceId,
    added_by: actor.addedBy,
  })

  if (linkErr) {
    if (linkErr.code === "23505") {
      return { success: false, error: "Bu kaynak zaten ekli." }
    }
    console.error("Custom kaynak atama hatası:", linkErr)
    return { success: false, error: "Kaynak eklendi ama öğrenciye atanamadı." }
  }

  revalidate(studentId)
  return { success: true }
}

export async function removeStudentResource(
  studentId: string,
  studentResourceId: string,
): Promise<Result> {
  const actor = await getActor(studentId)
  if (!actor.ok) return { success: false, error: actor.error }

  const { error } = await actor.supabase
    .from("student_resources")
    .delete()
    .eq("id", studentResourceId)
    .eq("student_id", studentId)

  if (error) {
    console.error("Kaynak kaldırma hatası:", error)
    return { success: false, error: "Kaynak kaldırılamadı." }
  }

  revalidate(studentId)
  return { success: true }
}

export async function setStudentResourceStatus(
  studentId: string,
  studentResourceId: string,
  status: string,
): Promise<Result> {
  const actor = await getActor(studentId)
  if (!actor.ok) return { success: false, error: actor.error }

  if (!RESOURCE_STATUSES.includes(status as (typeof RESOURCE_STATUSES)[number])) {
    return { success: false, error: "Geçersiz durum." }
  }

  const { error } = await actor.supabase
    .from("student_resources")
    .update({ status })
    .eq("id", studentResourceId)
    .eq("student_id", studentId)

  if (error) {
    console.error("Kaynak durum güncelleme hatası:", error)
    return { success: false, error: "Durum güncellenemedi." }
  }

  revalidate(studentId)
  return { success: true }
}
