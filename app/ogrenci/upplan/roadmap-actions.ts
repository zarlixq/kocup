"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { applyRoadmap, generateRoadmapDraft, redateQueue, syncRoadmapProgress } from "@/lib/upplan/roadmap-service"
import { applyProgramDraft, generateProgramDraft } from "@/lib/upplan/program-service"

type ActionResult<T = undefined> = { success: boolean; error?: string; data?: T }

const uuid = z.string().uuid()
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

async function requireStudent() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: "Oturum bulunamadı." }
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
  if (profile?.role !== "student") return { ok: false as const, error: "Yetkisiz işlem." }
  return { ok: true as const, supabase, userId: user.id }
}

function revalidateRoadmap(studentId: string) {
  revalidatePath("/ogrenci")
  revalidatePath("/ogrenci/konularim")
  revalidatePath("/ogrenci/program")
  revalidatePath(`/koc/ogrenciler/${studentId}/upplan`)
}

async function guard<T>(name: string, fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await fn()
  } catch (e) {
    console.error(name, e)
    return { success: false, error: "Bir hata oluştu, tekrar deneyin." }
  }
}

// ── Yol haritası ────────────────────────────────────────────────────────

/** Taslak üretir (koçlu öğrencide koça öneri olarak gider). */
export async function generateMyRoadmap(): Promise<ActionResult<{ coached: boolean }>> {
  return guard("generateMyRoadmap", async () => {
    const auth = await requireStudent()
    if (!auth.ok) return { success: false, error: auth.error }
    const res = await generateRoadmapDraft(supabaseAdmin(), auth.userId)
    if ("error" in res) return { success: false, error: res.error }
    revalidateRoadmap(auth.userId)
    return { success: true, data: { coached: res.coached } }
  })
}

export async function approveMyRoadmap(): Promise<ActionResult> {
  return guard("approveMyRoadmap", async () => {
    const auth = await requireStudent()
    if (!auth.ok) return { success: false, error: auth.error }
    const admin = supabaseAdmin()
    const res = await applyRoadmap(admin, auth.userId, auth.userId)
    if (res.error) return { success: false, error: res.error }
    await syncRoadmapProgress(admin, auth.userId)
    revalidateRoadmap(auth.userId)
    return { success: true }
  })
}

/** Öğrencinin kendi UpPlan satırı mı (RLS + origin kontrolü). */
async function ownRoadmapRow(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, id: string) {
  const { data } = await supabase
    .from("topic_assignments")
    .select("id, status, plan_order")
    .eq("id", id)
    .eq("student_id", userId)
    .eq("origin", "upplan")
    .maybeSingle()
  return data
}

/** Kuyruk sırası (Sırada sekmesi): verilen sırayla plan_order yazılır, tarihler yeniden hesaplanır. */
export async function setQueueOrder(ids: unknown): Promise<ActionResult> {
  return guard("setQueueOrder", async () => {
    const parsed = z.array(uuid).min(1).max(500).safeParse(ids)
    if (!parsed.success) return { success: false, error: "Geçersiz sıra." }
    const auth = await requireStudent()
    if (!auth.ok) return { success: false, error: auth.error }

    const { data: rows } = await auth.supabase
      .from("topic_assignments")
      .select("id, plan_order")
      .eq("student_id", auth.userId)
      .eq("origin", "upplan")
      .in("id", parsed.data)
    if (!rows || rows.length !== parsed.data.length) return { success: false, error: "Konu bulunamadı." }
    // Mevcut plan_order değerleri yeni sıraya dağıtılır (diğer sekmelerin sırası bozulmaz).
    const slots = rows.map((r) => r.plan_order ?? 0).sort((a, b) => a - b)
    const { error } = await auth.supabase.rpc("upplan_set_plan_orders", {
      p_student_id: auth.userId,
      p_ids: parsed.data,
      p_orders: parsed.data.map((_, i) => slots[i]),
    })
    if (error) {
      console.error("setQueueOrder", error)
      return { success: false, error: "Sıra kaydedilemedi." }
    }
    await redateQueue(supabaseAdmin(), auth.userId)
    revalidateRoadmap(auth.userId)
    return { success: true }
  })
}

export async function updateRoadmapTarget(id: string, hedefSoru: unknown): Promise<ActionResult> {
  return guard("updateRoadmapTarget", async () => {
    const q = z.number().int().min(5).max(2000).safeParse(hedefSoru)
    if (!uuid.safeParse(id).success || !q.success) return { success: false, error: "Hedef soru 5 ile 2000 arasında olmalı." }
    const auth = await requireStudent()
    if (!auth.ok) return { success: false, error: auth.error }
    if (!(await ownRoadmapRow(auth.supabase, auth.userId, id))) return { success: false, error: "Konu bulunamadı." }
    const { error } = await auth.supabase.from("topic_assignments").update({ hedef_soru: q.data }).eq("id", id)
    if (error) return { success: false, error: "Hedef güncellenemedi." }
    await redateQueue(supabaseAdmin(), auth.userId)
    revalidateRoadmap(auth.userId)
    return { success: true }
  })
}

/** Konuyu yol haritasından çıkar (iptal — silinmez) ya da geri ekle (sıranın sonuna). */
export async function setRoadmapItemRemoved(id: string, removed: boolean): Promise<ActionResult> {
  return guard("setRoadmapItemRemoved", async () => {
    if (!uuid.safeParse(id).success) return { success: false, error: "Konu bulunamadı." }
    const auth = await requireStudent()
    if (!auth.ok) return { success: false, error: auth.error }
    const row = await ownRoadmapRow(auth.supabase, auth.userId, id)
    if (!row) return { success: false, error: "Konu bulunamadı." }
    if (removed) {
      if (row.status === "tamamlandi") return { success: false, error: "Tamamlanan konu çıkarılamaz." }
      const { error } = await auth.supabase.from("topic_assignments").update({ status: "iptal" }).eq("id", id)
      if (error) return { success: false, error: "Çıkarılamadı." }
    } else {
      const { data: last } = await auth.supabase
        .from("topic_assignments")
        .select("plan_order")
        .eq("student_id", auth.userId)
        .eq("origin", "upplan")
        .order("plan_order", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle()
      const { error } = await auth.supabase
        .from("topic_assignments")
        .update({ status: "sirada", plan_order: (last?.plan_order ?? 0) + 1 })
        .eq("id", id)
      if (error) return { success: false, error: "Geri eklenemedi." }
    }
    const admin = supabaseAdmin()
    await syncRoadmapProgress(admin, auth.userId)
    await redateQueue(admin, auth.userId)
    revalidateRoadmap(auth.userId)
    return { success: true }
  })
}

// ── Haftalık program taslağı ────────────────────────────────────────────

export async function generateMyProgramDraft(weekStart: string): Promise<ActionResult<{ coached: boolean; count: number }>> {
  return guard("generateMyProgramDraft", async () => {
    if (!isoDate.safeParse(weekStart).success) return { success: false, error: "Geçersiz hafta." }
    const auth = await requireStudent()
    if (!auth.ok) return { success: false, error: auth.error }
    const res = await generateProgramDraft(supabaseAdmin(), auth.userId, weekStart)
    if ("error" in res) return { success: false, error: res.error }
    revalidateRoadmap(auth.userId)
    return { success: true, data: { coached: res.coached, count: res.items.length } }
  })
}

export async function decideMyProgramDraft(weekStart: string, approve: boolean): Promise<ActionResult<{ count: number }>> {
  return guard("decideMyProgramDraft", async () => {
    if (!isoDate.safeParse(weekStart).success) return { success: false, error: "Geçersiz hafta." }
    const auth = await requireStudent()
    if (!auth.ok) return { success: false, error: auth.error }
    const admin = supabaseAdmin()
    const { data: draft } = await admin
      .from("upplan_program_drafts")
      .select("status")
      .eq("student_id", auth.userId)
      .eq("week_start", weekStart)
      .maybeSingle()
    if (!draft) return { success: false, error: "Taslak bulunamadı." }
    if (draft.status === "koca_onerildi") return { success: false, error: "Bu öneri koçunun onayını bekliyor." }
    if (!approve) {
      await admin
        .from("upplan_program_drafts")
        .update({ status: "reddedildi", decided_at: new Date().toISOString(), decided_by: auth.userId })
        .eq("student_id", auth.userId)
        .eq("week_start", weekStart)
      revalidateRoadmap(auth.userId)
      return { success: true, data: { count: 0 } }
    }
    const res = await applyProgramDraft(admin, admin, auth.userId, weekStart, auth.userId)
    if (res.error) return { success: false, error: res.error }
    revalidateRoadmap(auth.userId)
    return { success: true, data: { count: res.count ?? 0 } }
  })
}

// ── Bildirimler ─────────────────────────────────────────────────────────

export async function dismissUpplanNotification(id: string): Promise<ActionResult> {
  return guard("dismissUpplanNotification", async () => {
    if (!uuid.safeParse(id).success) return { success: false, error: "Bildirim bulunamadı." }
    const auth = await requireStudent()
    if (!auth.ok) return { success: false, error: auth.error }
    const { error } = await auth.supabase
      .from("upplan_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id)
      .eq("student_id", auth.userId)
    if (error) return { success: false, error: "İşaretlenemedi." }
    revalidatePath("/ogrenci")
    return { success: true }
  })
}
