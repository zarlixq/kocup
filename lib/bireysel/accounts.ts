import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"
import { createRoleGrant } from "@/lib/auth/role-grant"
import { LEGAL_VERSIONS, type ConsentType } from "@/lib/legal/versions"

// Bireysel öğrenci hesabı oluşturma — ücretsiz kayıt ve davet kabulü ortak yolu.
// "use server" DEĞİL: server action'lar ve uçtan uca test service role client'ı
// vererek çağırır. Hata olursa oluşan auth kullanıcısı geri alınır.

type Admin = SupabaseClient<Database>

export type AcquisitionInfo = {
  source: "ucretsiz_kayit" | "davet"
  segment: "yks" | "lgs"
  alan: string | null
  is_minor: boolean
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
  invitation_id?: string | null
}

export type CreateStudentAccountInput = {
  email: string
  password: string
  fullName: string
  phone?: string | null
  /** Davet kabulünde e-posta davet bağlantısıyla doğrulanmış sayılır. */
  emailConfirmed: boolean
  grade: string | null
  organizationId?: string | null
  coachId?: string | null
  acquisition: AcquisitionInfo
}

export type CreateStudentAccountResult =
  | { ok: true; userId: string }
  | { ok: false; error: string; code?: "email_exists" }

function isEmailExists(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false
  const msg = (err.message ?? "").toLowerCase()
  return err.code === "email_exists" || err.code === "user_already_exists" || msg.includes("already been registered")
}

export function consentRows(userId: string, isMinor: boolean, at: Date = new Date()) {
  const types: ConsentType[] = ["kullanim_sartlari", "gizlilik", "kvkk_aydinlatma"]
  if (isMinor) types.push("veli_bilgisi")
  return types.map((t) => ({
    user_id: userId,
    consent_type: t,
    version: LEGAL_VERSIONS[t],
    accepted_at: at.toISOString(),
  }))
}

export async function createStudentAccount(
  admin: Admin,
  input: CreateStudentAccountInput,
): Promise<CreateStudentAccountResult> {
  const email = input.email.trim().toLowerCase()
  const orgId = input.organizationId ?? null

  let grantId: string
  try {
    grantId = await createRoleGrant(email, "student", orgId)
  } catch (err) {
    console.error("createStudentAccount grant:", err)
    return { ok: false, error: "Bir hata oluştu, tekrar deneyin." }
  }

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: input.emailConfirmed,
    user_metadata: {
      role: "student",
      role_grant: grantId,
      full_name: input.fullName,
      phone: input.phone ?? undefined,
    },
  })
  if (createErr || !created.user) {
    if (isEmailExists(createErr)) {
      return { ok: false, code: "email_exists", error: "Bu e-posta ile zaten bir hesap var. Giriş yapmayı dene." }
    }
    console.error("createStudentAccount createUser:", createErr)
    return { ok: false, error: "Hesap oluşturulamadı, tekrar deneyin." }
  }
  const userId = created.user.id

  const rollback = async (step: string, err: unknown) => {
    console.error(`createStudentAccount ${step}:`, err)
    await admin.auth.admin.deleteUser(userId)
    return { ok: false as const, error: "Hesap oluşturulamadı, tekrar deneyin." }
  }

  // Trigger hibeden profili oluşturur; yine de yoksa (ör. hibe süresi dolduysa) yaz.
  const { data: profile } = await admin.from("profiles").select("id").eq("id", userId).maybeSingle()
  if (!profile) {
    const { error } = await admin.from("profiles").insert({
      id: userId,
      role: "student",
      full_name: input.fullName,
      email,
      phone: input.phone ?? null,
      organization_id: orgId,
    })
    if (error) return rollback("profile", error)
  }

  const { error: stuErr } = await admin.from("students").insert({
    id: userId,
    coach_id: input.coachId ?? null,
    organization_id: orgId,
    grade: input.grade,
    kayit_kaynagi: orgId ? "kurum_import" : "basvuru",
    is_active: true,
  })
  if (stuErr) return rollback("students", stuErr)

  const a = input.acquisition
  const { error: acqErr } = await admin.from("student_acquisition").insert({
    student_id: userId,
    source: a.source,
    segment: a.segment,
    alan: a.alan,
    grade: input.grade,
    is_minor: a.is_minor,
    utm_source: a.utm_source ?? null,
    utm_medium: a.utm_medium ?? null,
    utm_campaign: a.utm_campaign ?? null,
    invitation_id: a.invitation_id ?? null,
  })
  if (acqErr) return rollback("acquisition", acqErr)

  const { error: conErr } = await admin.from("user_consents").insert(consentRows(userId, a.is_minor))
  if (conErr) return rollback("consents", conErr)

  return { ok: true, userId }
}
