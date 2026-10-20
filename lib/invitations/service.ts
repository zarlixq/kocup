import { createHash, randomBytes } from "crypto"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"
import { getSiteUrl } from "@/lib/site-url"
import { isEmailEnabled, sendEmail } from "@/lib/email/send"
import { invitationTemplate } from "@/lib/email/templates"
import { createStudentAccount } from "@/lib/bireysel/accounts"
import type { InvitationInput } from "@/lib/bireysel/schemas"

// Öğrenci davetleri — saf sunucu servisleri ("use server" DEĞİL; action'lar ve
// uçtan uca test çağırır). Token yalnız e-postada/linkte düz; DB'de SHA-256 hash.

type Client = SupabaseClient<Database>
export type InvitationRow = Database["public"]["Tables"]["student_invitations"]["Row"]
export type InvitationStatus = "gonderildi" | "kabul_edildi" | "suresi_doldu" | "iptal"

export const INVITE_TTL_DAYS = 7

export function generateInviteToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url")
  return { token, hash: hashInviteToken(token) }
}

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export function inviteUrl(token: string): string {
  return `${getSiteUrl()}/davet/${token}`
}

function expiresAt(from = new Date()): string {
  return new Date(from.getTime() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString()
}

/** Görünen durum: süresi geçmiş ama henüz işaretlenmemiş 'gonderildi' → suresi_doldu. */
export function effectiveStatus(row: Pick<InvitationRow, "status" | "expires_at">, now = new Date()): InvitationStatus {
  if (row.status === "gonderildi" && new Date(row.expires_at) <= now) return "suresi_doldu"
  return row.status as InvitationStatus
}

/** Süresi dolan bekleyen davetleri işaretler (service role). */
export async function expireStaleInvitations(admin: Client): Promise<void> {
  const { error } = await admin
    .from("student_invitations")
    .update({ status: "suresi_doldu", updated_at: new Date().toISOString() })
    .eq("status", "gonderildi")
    .lt("expires_at", new Date().toISOString())
  if (error) console.error("expireStaleInvitations:", error)
}

export type SendOutcome = { emailed: boolean; link: string }

async function deliver(row: Pick<InvitationRow, "email" | "full_name">, token: string, inviterName: string | null): Promise<SendOutcome> {
  const link = inviteUrl(token)
  if (!isEmailEnabled()) return { emailed: false, link }
  const first = row.full_name.split(" ")[0] ?? row.full_name
  const res = await sendEmail(invitationTemplate(row.email, first, link, inviterName))
  return { emailed: res.ok, link }
}

/**
 * Davet oluşturur. `client` çağıranın oturum client'ı olmalı → RLS (müdür veya
 * kendi kurumunun org_admin'i) son savunma hattıdır.
 */
export async function createInvitation(
  client: Client,
  input: InvitationInput,
  invitedBy: string,
  inviterName: string | null,
): Promise<{ ok: true; id: string; outcome: SendOutcome } | { ok: false; error: string }> {
  const { token, hash } = generateInviteToken()
  const { data, error } = await client
    .from("student_invitations")
    .insert({
      email: input.email,
      full_name: input.full_name,
      phone: input.phone,
      segment: input.segment,
      grade: input.grade,
      organization_id: input.organization_id,
      coach_id: input.coach_id,
      token_hash: hash,
      invited_by: invitedBy,
      expires_at: expiresAt(),
    })
    .select("id, email, full_name")
    .single()

  if (error || !data) {
    if (error?.code === "23505") return { ok: false, error: "Bu e-postaya bekleyen bir davet zaten var." }
    if (error?.code === "42501") return { ok: false, error: "Bu davet için yetkiniz yok." }
    console.error("createInvitation:", error)
    return { ok: false, error: "Davet oluşturulamadı." }
  }
  return { ok: true, id: data.id, outcome: await deliver(data, token, inviterName) }
}

/** Yeni token + süre yenileme (RLS: çağıranın oturum client'ı). */
export async function resendInvitation(
  client: Client,
  id: string,
  inviterName: string | null,
): Promise<{ ok: true; outcome: SendOutcome } | { ok: false; error: string }> {
  const { data: row } = await client.from("student_invitations").select("id, status, email, full_name").eq("id", id).maybeSingle()
  if (!row) return { ok: false, error: "Davet bulunamadı." }
  if (row.status === "kabul_edildi") return { ok: false, error: "Bu davet zaten kabul edildi." }
  if (row.status === "iptal") return { ok: false, error: "İptal edilmiş davet yeniden gönderilemez; yeni davet oluşturun." }

  const { token, hash } = generateInviteToken()
  const { data: current } = await client.from("student_invitations").select("send_count").eq("id", id).single()
  const { error } = await client
    .from("student_invitations")
    .update({
      token_hash: hash,
      status: "gonderildi",
      expires_at: expiresAt(),
      sent_at: new Date().toISOString(),
      send_count: (current?.send_count ?? 1) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .in("status", ["gonderildi", "suresi_doldu"])
  if (error) {
    if (error.code === "23505") return { ok: false, error: "Bu e-postaya bekleyen başka bir davet var." }
    console.error("resendInvitation:", error)
    return { ok: false, error: "Davet yeniden gönderilemedi." }
  }
  return { ok: true, outcome: await deliver(row, token, inviterName) }
}

export async function cancelInvitation(client: Client, id: string): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await client
    .from("student_invitations")
    .update({ status: "iptal", cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id)
    .in("status", ["gonderildi", "suresi_doldu"])
    .select("id")
  if (error) {
    console.error("cancelInvitation:", error)
    return { ok: false, error: "Davet iptal edilemedi." }
  }
  if (!data?.length) return { ok: false, error: "Bu davet iptal edilemez (kabul edilmiş veya zaten iptal)." }
  return { ok: true }
}

export type TokenLookup =
  | { ok: true; invitation: InvitationRow }
  | { ok: false; reason: "gecersiz" | "kullanildi" | "suresi_doldu" | "iptal" }

/** Kabul sayfası için token doğrulama (service role). */
export async function lookupInvitationToken(admin: Client, token: string): Promise<TokenLookup> {
  if (!token || token.length < 20 || token.length > 200) return { ok: false, reason: "gecersiz" }
  const { data } = await admin.from("student_invitations").select("*").eq("token_hash", hashInviteToken(token)).maybeSingle()
  if (!data) return { ok: false, reason: "gecersiz" }
  const status = effectiveStatus(data)
  if (status === "kabul_edildi") return { ok: false, reason: "kullanildi" }
  if (status === "iptal") return { ok: false, reason: "iptal" }
  if (status === "suresi_doldu") return { ok: false, reason: "suresi_doldu" }
  return { ok: true, invitation: data }
}

export type AcceptResult =
  | { ok: true; userId: string; email: string; individual: boolean }
  | { ok: false; error: string }

/**
 * Daveti kabul eder: token'ı atomik olarak tüketir (tek kullanım), hesabı
 * davetteki bilgilerle oluşturur. Hesap oluşamazsa davet tekrar kullanılabilir olur.
 */
export async function acceptInvitation(
  admin: Client,
  input: { token: string; password: string; isMinor: boolean },
): Promise<AcceptResult> {
  const now = new Date().toISOString()
  const { data: claimed, error } = await admin
    .from("student_invitations")
    .update({ status: "kabul_edildi", accepted_at: now, updated_at: now })
    .eq("token_hash", hashInviteToken(input.token))
    .eq("status", "gonderildi")
    .gt("expires_at", now)
    .select("*")
  if (error) {
    console.error("acceptInvitation claim:", error)
    return { ok: false, error: "Bir hata oluştu, tekrar deneyin." }
  }
  const inv = claimed?.[0]
  if (!inv) return { ok: false, error: "Davet bağlantısı geçersiz, kullanılmış veya süresi dolmuş." }

  const res = await createStudentAccount(admin, {
    email: inv.email,
    password: input.password,
    fullName: inv.full_name,
    phone: inv.phone,
    emailConfirmed: true,
    grade: inv.grade,
    organizationId: inv.organization_id,
    coachId: inv.coach_id,
    acquisition: {
      source: "davet",
      segment: inv.segment as "yks" | "lgs",
      alan: null,
      is_minor: input.isMinor,
      invitation_id: inv.id,
    },
  })

  if (!res.ok) {
    await admin
      .from("student_invitations")
      .update({ status: "gonderildi", accepted_at: null, updated_at: new Date().toISOString() })
      .eq("id", inv.id)
      .eq("status", "kabul_edildi")
    return { ok: false, error: res.error }
  }

  await admin.from("student_invitations").update({ accepted_user_id: res.userId }).eq("id", inv.id)
  return { ok: true, userId: res.userId, email: inv.email, individual: !inv.organization_id && !inv.coach_id }
}
