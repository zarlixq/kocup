"use server"

import { randomBytes } from "crypto"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { inviteStudent, createStudentWithPassword } from "@/lib/auth/invite"
import type { ImportRowData } from "@/lib/import/csv"

type Importer =
  | { ok: true; userId: string; role: "admin" | "org_admin"; orgId: string | null }
  | { ok: false; error: string }

type JobProgress = {
  id: string
  total: number
  processed: number
  succeeded: number
  failed: number
  status: string
}

type ChunkResult =
  | { ok: true; done: boolean; progress: JobProgress }
  | { ok: false; error: string }

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms))

// Import satırı hatalarını kullanıcıya gösterilecek anlaşılır Türkçe mesaja çevirir.
// Özellikle: önceden kayıtlı e-posta (Supabase createUser/inviteUserByEmail raw
// "...already been registered" döndürür) → net bir mesaj.
function friendlyImportError(err: unknown): string {
  if (!(err instanceof Error)) return "Bilinmeyen hata"
  const msg = err.message
  const code = (err as { code?: unknown }).code
  const lower = msg.toLowerCase()
  if (
    code === "email_exists" ||
    code === "user_already_exists" ||
    lower.includes("already been registered") ||
    lower.includes("already registered") ||
    lower.includes("already exists")
  ) {
    return "Bu e-posta adresi zaten kayıtlı."
  }
  return msg
}

// Karışıklık yaratan karakterler (0/O, 1/l/I) çıkarılmış güçlü geçici şifre
function generatePassword(len = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"
  const bytes = randomBytes(len)
  let out = ""
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length]
  return out
}

async function getImporter(): Promise<Importer> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Oturum bulunamadı." }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", user.id)
    .maybeSingle()

  if (profile?.role === "admin") {
    return { ok: true, userId: user.id, role: "admin", orgId: null }
  }
  if (profile?.role === "org_admin") {
    if (!profile.organization_id) return { ok: false, error: "Kuruma bağlı değilsiniz." }
    return { ok: true, userId: user.id, role: "org_admin", orgId: profile.organization_id }
  }
  return { ok: false, error: "Bu işlem için yetkiniz yok." }
}

function canAccess(
  importer: Extract<Importer, { ok: true }>,
  job: { created_by: string; organization_id: string | null },
): boolean {
  if (importer.role === "admin") return true
  if (job.created_by === importer.userId) return true
  return importer.role === "org_admin" && job.organization_id === importer.orgId
}

const rowDataSchema = z.object({
  full_name: z.string().min(2),
  email: z.string().email(),
  grade: z.string().nullable(),
  segment: z.string().nullable(),
  phone: z.string().nullable(),
  parent_name: z.string().nullable(),
  parent_phone: z.string().nullable(),
  school: z.string().nullable(),
})

/**
 * Doğrulanmış satırlarla yeni import işi oluşturur.
 * mode='invite' (varsayılan): mevcut mail-davetli akış (B2C/kurum org_admin).
 * mode='password': müdür kurum-içi geçici şifreli akış — targetOrgId + coachId
 * server-side doğrulanır; her satıra geçici şifre (Mod A ortak / Mod B rastgele) yazılır.
 */
export async function createImportJob(input: {
  filename: string
  rows: ImportRowData[]
  mode?: "invite" | "password"
  targetOrgId?: string | null
  coachId?: string | null
  commonPassword?: string | null
}): Promise<{ ok: true; jobId: string; total: number } | { ok: false; error: string }> {
  const importer = await getImporter()
  if (!importer.ok) return { ok: false, error: importer.error }

  const rows = z.array(rowDataSchema).max(1000).safeParse(input.rows)
  if (!rows.success || rows.data.length === 0) {
    return { ok: false, error: "Geçerli kayıt bulunamadı (en fazla 1000)." }
  }

  const mode = input.mode ?? "invite"
  const admin = supabaseAdmin()

  // Job parametreleri — varsayılan: mevcut davet akışı
  let jobOrgId: string | null = importer.orgId
  let jobCoachId: string | null = null
  let passwordFor: (i: number) => string | null = () => null

  if (mode === "password") {
    // Geçici şifreli import yalnızca platform müdürü (admin) tarafından, kurum içinden
    if (importer.role !== "admin") return { ok: false, error: "Bu işlem için yetkiniz yok." }
    if (!input.targetOrgId) return { ok: false, error: "Kurum seçilmedi." }
    if (!input.coachId) return { ok: false, error: "Koç seçilmedi." }

    const { data: org } = await admin
      .from("organizations")
      .select("id")
      .eq("id", input.targetOrgId)
      .maybeSingle()
    if (!org) return { ok: false, error: "Kurum bulunamadı." }

    const { data: coach } = await admin
      .from("profiles")
      .select("id, role, organization_id")
      .eq("id", input.coachId)
      .maybeSingle()
    if (!coach || coach.role !== "coach" || coach.organization_id !== input.targetOrgId) {
      return { ok: false, error: "Seçilen koç bu kuruma ait değil." }
    }

    const common = (input.commonPassword ?? "").trim()
    if (common && common.length < 6) {
      return { ok: false, error: "Ortak şifre en az 6 karakter olmalı." }
    }

    jobOrgId = input.targetOrgId
    jobCoachId = input.coachId
    // Mod A: ortak şifre; Mod B: satır başına rastgele
    passwordFor = common ? () => common : () => generatePassword()
  }

  const { data: job, error: jobErr } = await admin
    .from("import_jobs")
    .insert({
      created_by: importer.userId,
      organization_id: jobOrgId,
      coach_id: jobCoachId,
      mode,
      filename: input.filename.slice(0, 200),
      total: rows.data.length,
      status: "pending",
    })
    .select("id")
    .single()

  if (jobErr || !job) {
    console.error("Import işi oluşturma hatası:", jobErr)
    return { ok: false, error: "İş oluşturulamadı." }
  }

  const { error: rowsErr } = await admin.from("import_rows").insert(
    rows.data.map((d, i) => ({
      job_id: job.id,
      row_index: i,
      data: d,
      status: "pending",
      generated_password: passwordFor(i),
    })),
  )
  if (rowsErr) {
    console.error("Import satırları yazma hatası:", rowsErr)
    await admin.from("import_jobs").delete().eq("id", job.id)
    return { ok: false, error: "Kayıtlar yazılamadı." }
  }

  return { ok: true, jobId: job.id, total: rows.data.length }
}

/** Sıradaki bekleyen 1 satırı işler (davet + öğrenci kaydı), throttle uygular. */
export async function processNextChunk(jobId: string): Promise<ChunkResult> {
  const importer = await getImporter()
  if (!importer.ok) return { ok: false, error: importer.error }

  const admin = supabaseAdmin()
  const { data: job } = await admin
    .from("import_jobs")
    .select("id, created_by, organization_id, coach_id, mode, total, processed, succeeded, failed, status")
    .eq("id", jobId)
    .maybeSingle()

  if (!job) return { ok: false, error: "İş bulunamadı." }
  if (!canAccess(importer, job)) return { ok: false, error: "Bu işe erişiminiz yok." }

  const progressOf = (j: typeof job): JobProgress => ({
    id: j.id,
    total: j.total,
    processed: j.processed,
    succeeded: j.succeeded,
    failed: j.failed,
    status: j.status,
  })

  if (job.status === "completed") return { ok: true, done: true, progress: progressOf(job) }

  const { data: rows } = await admin
    .from("import_rows")
    .select("id, row_index, data, generated_password")
    .eq("job_id", jobId)
    .eq("status", "pending")
    .order("row_index")
    .limit(1)

  const row = rows?.[0]
  if (!row) {
    const { data: updated } = await admin
      .from("import_jobs")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", jobId)
      .select("id, total, processed, succeeded, failed, status")
      .single()
    return {
      ok: true,
      done: true,
      progress: updated ? progressOf({ ...job, ...updated }) : progressOf({ ...job, status: "completed" }),
    }
  }

  // Throttle yalnızca mail-davetli modda gerekir (rate-limit). Şifre modunda mail yok.
  if (job.mode !== "password") await sleep(1000)

  const d = row.data as ImportRowData
  let rowStatus: "success" | "error" = "success"
  let errorMessage: string | null = null
  let createdStudentId: string | null = null

  try {
    let userId: string

    if (job.mode === "password") {
      // Geçici şifreyle hesap oluştur (mail YOK)
      if (!row.generated_password) throw new Error("Geçici şifre üretilemedi.")
      const created = await createStudentWithPassword({
        email: d.email,
        password: row.generated_password,
        full_name: d.full_name,
        phone: d.phone,
        organization_id: job.organization_id,
      })
      userId = created.id
      // İlk girişte zorunlu şifre değiştirme bayrağı (trigger profili oluşturdu)
      await admin.from("profiles").update({ must_change_password: true }).eq("id", userId)
    } else {
      // Mevcut mail-davetli akış (değişmedi)
      const invited = await inviteStudent({
        email: d.email,
        full_name: d.full_name,
        phone: d.phone,
        grade: d.grade ?? undefined,
        parent_name: d.parent_name,
        parent_phone: d.parent_phone,
        organization_id: importer.orgId,
        skipGhostCleanup: true,
      })
      userId = invited.id
    }

    const { error: stuErr } = await admin.from("students").insert({
      id: userId,
      coach_id: job.mode === "password" ? job.coach_id : null,
      kayit_kaynagi: job.mode === "password" ? "kurum_import" : "koc_ekledi",
      grade: d.grade,
      school: d.school,
      parent_name: d.parent_name,
      parent_phone: d.parent_phone,
      organization_id: job.organization_id,
      is_active: true,
    })
    if (stuErr) throw new Error(stuErr.message)
    createdStudentId = userId
  } catch (err) {
    rowStatus = "error"
    errorMessage = friendlyImportError(err)
  }

  await admin
    .from("import_rows")
    .update({ status: rowStatus, error_message: errorMessage, created_student_id: createdStudentId })
    .eq("id", row.id)

  const processed = job.processed + 1
  const succeeded = job.succeeded + (rowStatus === "success" ? 1 : 0)
  const failed = job.failed + (rowStatus === "error" ? 1 : 0)
  const done = processed >= job.total

  const { data: updated } = await admin
    .from("import_jobs")
    .update({
      processed,
      succeeded,
      failed,
      status: done ? "completed" : "processing",
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .select("id, total, processed, succeeded, failed, status")
    .single()

  if (done) {
    revalidatePath("/mudur/ogrenciler")
    revalidatePath("/kurum/ogrenciler")
    if (job.organization_id) revalidatePath(`/mudur/kurumlar/${job.organization_id}`)
  }

  return {
    ok: true,
    done,
    progress: updated
      ? progressOf({ ...job, ...updated })
      : { id: jobId, total: job.total, processed, succeeded, failed, status: done ? "completed" : "processing" },
  }
}

export type ImportErrorRow = { row_index: number; email: string; error: string }

/** İş durumu + hatalı satırların raporu (devam/polling ve sonuç ekranı için). */
export async function getImportJob(jobId: string): Promise<
  { ok: true; progress: JobProgress; errors: ImportErrorRow[] } | { ok: false; error: string }
> {
  const supabase = await createClient()
  const { data: job } = await supabase
    .from("import_jobs")
    .select("id, total, processed, succeeded, failed, status")
    .eq("id", jobId)
    .maybeSingle()
  if (!job) return { ok: false, error: "İş bulunamadı." }

  const { data: errorRows } = await supabase
    .from("import_rows")
    .select("row_index, data, error_message")
    .eq("job_id", jobId)
    .eq("status", "error")
    .order("row_index")

  const errors: ImportErrorRow[] = (errorRows ?? []).map((r) => ({
    row_index: r.row_index,
    email: (r.data as ImportRowData)?.email ?? "—",
    error: r.error_message ?? "Bilinmeyen hata",
  }))

  return { ok: true, progress: job, errors }
}

export type ImportPasswordRow = { full_name: string; email: string; password: string }

/**
 * Geçici şifreli import işinin başarılı satırları için ad/email/şifre listesi.
 * Sadece işi yapan müdür (canAccess) çekebilir — Mod B indirme listesi için.
 */
export async function getImportPasswordList(
  jobId: string,
): Promise<{ ok: true; rows: ImportPasswordRow[] } | { ok: false; error: string }> {
  const importer = await getImporter()
  if (!importer.ok) return { ok: false, error: importer.error }

  const admin = supabaseAdmin()
  const { data: job } = await admin
    .from("import_jobs")
    .select("id, created_by, organization_id, mode")
    .eq("id", jobId)
    .maybeSingle()
  if (!job) return { ok: false, error: "İş bulunamadı." }
  if (!canAccess(importer, job)) return { ok: false, error: "Bu işe erişiminiz yok." }
  if (job.mode !== "password") return { ok: false, error: "Bu iş şifre listesi içermiyor." }

  const { data: rows } = await admin
    .from("import_rows")
    .select("data, generated_password")
    .eq("job_id", jobId)
    .eq("status", "success")
    .order("row_index")

  const out: ImportPasswordRow[] = (rows ?? []).map((r) => ({
    full_name: (r.data as ImportRowData)?.full_name ?? "",
    email: (r.data as ImportRowData)?.email ?? "",
    password: r.generated_password ?? "",
  }))
  return { ok: true, rows: out }
}

/** Devam eden (tamamlanmamış) son işi getirir — sayfa yeniden açılınca sürdürmek için. */
export async function getActiveImportJob(): Promise<{ jobId: string; progress: JobProgress } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: job } = await supabase
    .from("import_jobs")
    .select("id, total, processed, succeeded, failed, status")
    .eq("created_by", user.id)
    .neq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!job) return null
  return { jobId: job.id, progress: job }
}
