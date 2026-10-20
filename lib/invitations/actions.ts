"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { invitationSchema } from "@/lib/bireysel/schemas"
import { cancelInvitation, createInvitation, resendInvitation, type SendOutcome } from "@/lib/invitations/service"

// Davet server action'ları — müdür (admin) ve kurum yöneticisi (org_admin) ortak.
// org_admin için kurum her zaman oturumdan gelir; koç yalnız kendi kurumundan.
// Yazmalar oturum client'ıyla yapılır → RLS de aynı kuralı zorlar.

type Result<T = undefined> = { success: boolean; error?: string; data?: T }

type Caller = {
  supabase: Awaited<ReturnType<typeof createClient>>
  userId: string
  role: "admin" | "org_admin"
  orgId: string | null
  name: string
}

async function getCaller(): Promise<Caller | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id, full_name")
    .eq("id", user.id)
    .maybeSingle()
  if (profile?.role === "admin") {
    return { supabase, userId: user.id, role: "admin", orgId: null, name: profile.full_name }
  }
  if (profile?.role === "org_admin" && profile.organization_id) {
    return { supabase, userId: user.id, role: "org_admin", orgId: profile.organization_id, name: profile.full_name }
  }
  return null
}

function revalidate() {
  revalidatePath("/mudur/davetler")
  revalidatePath("/kurum/davetler")
  revalidatePath("/mudur/ogrenciler")
}

async function inviterLabel(caller: Caller): Promise<string> {
  if (caller.role === "org_admin" && caller.orgId) {
    const { data: org } = await caller.supabase.from("organizations").select("name").eq("id", caller.orgId).maybeSingle()
    if (org?.name) return org.name
  }
  return "KoçUp"
}

/** Tek davet: doğrula, yetki/kapsam kontrolü, oluştur, e-posta gönder (varsa). */
async function createOne(caller: Caller, raw: unknown, inviter: string): Promise<Result<SendOutcome>> {
  const parsed = invitationSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Form hatalı." }
  const input = { ...parsed.data }

  if (caller.role === "org_admin") {
    if (input.organization_id && input.organization_id !== caller.orgId) {
      return { success: false, error: "Yalnızca kendi kurumunuza davet gönderebilirsiniz." }
    }
    input.organization_id = caller.orgId
  }

  const admin = supabaseAdmin()
  if (input.organization_id) {
    const { data: org } = await admin.from("organizations").select("id").eq("id", input.organization_id).maybeSingle()
    if (!org) return { success: false, error: "Kurum bulunamadı." }
  }
  if (input.coach_id) {
    const { data: coach } = await admin
      .from("profiles")
      .select("role, organization_id")
      .eq("id", input.coach_id)
      .maybeSingle()
    if (!coach || coach.role !== "coach") return { success: false, error: "Koç bulunamadı." }
    if (input.organization_id && coach.organization_id !== input.organization_id) {
      return { success: false, error: "Seçilen koç bu kuruma ait değil." }
    }
  }

  const { data: existing } = await admin.from("profiles").select("id").eq("email", input.email).maybeSingle()
  if (existing) return { success: false, error: "Bu e-posta ile zaten bir hesap var." }

  const res = await createInvitation(caller.supabase, input, caller.userId, inviter)
  if (!res.ok) return { success: false, error: res.error }
  return { success: true, data: res.outcome }
}

export async function createInvitationAction(raw: unknown): Promise<Result<SendOutcome>> {
  const caller = await getCaller()
  if (!caller) return { success: false, error: "Yetkisiz işlem." }
  try {
    const res = await createOne(caller, raw, await inviterLabel(caller))
    if (res.success) revalidate()
    return res
  } catch (err) {
    console.error("createInvitationAction:", err)
    return { success: false, error: "Bir hata oluştu, tekrar deneyin." }
  }
}

export type BulkRowResult = { email: string; full_name: string; ok: boolean; error?: string; link?: string; emailed?: boolean }

/** Toplu davet — istemci satırları küçük parçalar halinde gönderir (en fazla 10). */
export async function bulkInvitationChunkAction(rows: unknown[]): Promise<Result<BulkRowResult[]>> {
  const caller = await getCaller()
  if (!caller) return { success: false, error: "Yetkisiz işlem." }
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > 10) {
    return { success: false, error: "Geçersiz parça boyutu." }
  }
  const inviter = await inviterLabel(caller)
  const out: BulkRowResult[] = []
  for (const raw of rows) {
    const r = (raw ?? {}) as { email?: unknown; full_name?: unknown }
    const base = { email: String(r.email ?? ""), full_name: String(r.full_name ?? "") }
    try {
      const res = await createOne(caller, raw, inviter)
      out.push(res.success ? { ...base, ok: true, link: res.data?.link, emailed: res.data?.emailed } : { ...base, ok: false, error: res.error })
    } catch (err) {
      console.error("bulkInvitationChunkAction:", err)
      out.push({ ...base, ok: false, error: "Bir hata oluştu." })
    }
    // Resend hız sınırı (~2 istek/sn)
    await new Promise((r) => setTimeout(r, 550))
  }
  revalidate()
  return { success: true, data: out }
}

export async function resendInvitationAction(id: string): Promise<Result<SendOutcome>> {
  const caller = await getCaller()
  if (!caller) return { success: false, error: "Yetkisiz işlem." }
  const res = await resendInvitation(caller.supabase, id, await inviterLabel(caller))
  if (!res.ok) return { success: false, error: res.error }
  revalidate()
  return { success: true, data: res.outcome }
}

export async function cancelInvitationAction(id: string): Promise<Result> {
  const caller = await getCaller()
  if (!caller) return { success: false, error: "Yetkisiz işlem." }
  const res = await cancelInvitation(caller.supabase, id)
  if (!res.ok) return { success: false, error: res.error }
  revalidate()
  return { success: true }
}
