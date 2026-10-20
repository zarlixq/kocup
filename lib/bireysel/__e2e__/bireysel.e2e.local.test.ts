// Bireysel öğrenci uçtan uca test — TEST hesaplarıyla canlı DB'ye gerçekten yazar.
// Çalıştırma: E2E=1 npx vitest run lib/bireysel/__e2e__
// Server action'lar cookie/oturum gerektirdiği için action'ların çağırdığı servis
// fonksiyonları (lib/bireysel, lib/invitations) aynı client'larla çağrılır:
// oturum işlemleri öğrenci oturumuyla (RLS), servis işlemleri service role ile.
// Bitince tüm test hesapları ve satırları silinir ve kalıntı sayımı yapılır.
import { afterAll, describe, expect, it } from "vitest"
import { writeFileSync } from "node:fs"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"
import { loadEnv } from "../../../scripts/lib/env.mjs"
import { createStudentAccount } from "@/lib/bireysel/accounts"
import { deleteOwnAccount } from "@/lib/bireysel/delete-account"
import { summarize, type IndividualStudentRow } from "@/lib/bireysel/overview"
import { acceptInvitation, generateInviteToken, lookupInvitationToken } from "@/lib/invitations/service"
import { istanbulDateStr } from "@/lib/tz"

loadEnv()
type C = SupabaseClient<Database>
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const admin: C = createClient<Database>(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
const anon = () => createClient<Database>(URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } })

const PASS = "Test-Bireysel-2026!x"
const EMAILS = {
  signup: "test-bireysel-kayit@kocupakademi.com",
  invite: "test-bireysel-davet@kocupakademi.com",
  coach: "test-bireysel-koc@kocupakademi.com",
  attacker: "test-bireysel-saldiri@kocupakademi.com",
}
const report: Record<string, unknown> = {}

// Kullanıcıya ait satır kalıp kalmadığını kontrol edilecek (tablo, kolon) çiftleri.
const USER_COLUMNS: [string, string][] = [
  ["profiles", "id"], ["students", "id"], ["students", "coach_id"], ["student_topics", "student_id"],
  ["study_sessions", "student_id"], ["study_sessions", "created_by"], ["study_sessions", "updated_by"],
  ["exams", "student_id"], ["exams", "created_by"], ["schedule", "student_id"], ["appointments", "student_id"],
  ["appointments", "created_by"], ["topic_assignments", "student_id"], ["topic_assignments", "created_by"],
  ["etut_schedule", "student_id"], ["student_resources", "student_id"], ["import_rows", "created_student_id"],
  ["weekly_programs", "student_id"], ["weekly_programs", "created_by"], ["wrong_answers", "student_id"],
  ["coach_assignment_history", "student_id"], ["student_upplan_profile", "student_id"],
  ["student_topic_self_assessment", "student_id"], ["student_topic_mastery", "student_id"],
  ["upplan_roadmaps", "student_id"], ["upplan_program_drafts", "student_id"], ["upplan_notifications", "student_id"],
  ["student_resource_playlists", "student_id"], ["student_resource_videos", "student_id"],
  ["applications", "approved_student_id"], ["user_ui_preferences", "user_id"], ["packages", "student_id"],
  ["payments", "student_id"], ["student_acquisition", "student_id"], ["user_consents", "user_id"],
  ["student_invitations", "accepted_user_id"], ["feedback", "user_id"], ["auth_role_grants", "used_by"],
]

async function findUserId(email: string): Promise<string | null> {
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 })
  return data.users.find((u) => u.email === email)?.id ?? null
}

async function residue(userId: string, email: string): Promise<Record<string, number>> {
  const out: Record<string, number> = {}
  for (const [table, col] of USER_COLUMNS) {
    const { count, error } = await admin.from(table as "profiles").select("*", { count: "exact", head: true }).eq(col as "id", userId)
    if (error) throw new Error(`${table}.${col}: ${error.message}`)
    if (count) out[`${table}.${col}`] = count
  }
  for (const table of ["student_invitations", "auth_role_grants", "profiles"] as const) {
    const { count } = await admin.from(table).select("*", { count: "exact", head: true }).ilike("email", email)
    if (count) out[`${table}.email`] = count
  }
  const { data } = await admin.auth.admin.getUserById(userId)
  if (data.user) out["auth.users"] = 1
  return out
}

async function cleanupTestAccounts() {
  for (const email of Object.values(EMAILS)) {
    const id = await findUserId(email)
    if (id) await admin.auth.admin.deleteUser(id)
    // Test e-postasına ait davet/hibe satırları (yalnız test adresleri)
    await admin.from("student_invitations").delete().ilike("email", email)
    await admin.from("auth_role_grants").delete().ilike("email", email)
  }
}

async function overviewRow(userId: string) {
  const { data, error } = await admin.rpc("individual_students_overview")
  if (error) throw error
  return { all: data ?? [], row: (data ?? []).find((r) => r.student_id === userId) ?? null }
}

function toRow(r: Awaited<ReturnType<typeof overviewRow>>["all"][number]): IndividualStudentRow {
  return {
    id: r.student_id, full_name: r.full_name, email: r.email, created_at: r.created_at,
    source: r.source === "ucretsiz_kayit" || r.source === "davet" ? r.source : null,
    utm_source: r.utm_source, utm_medium: r.utm_medium, utm_campaign: r.utm_campaign, segment: r.segment,
    alan: r.alan, grade: r.grade, email_confirmed: r.email_confirmed, upplan_completed: r.upplan_completed,
    last_sign_in_at: r.last_sign_in_at, sessions_7d: r.sessions_7d, first_session_date: r.first_session_date,
    last_activity_date: r.last_activity_date, returned_d7: r.returned_d7, compliance_percent: null,
  }
}

describe.sequential("bireysel öğrenci uçtan uca", () => {
  it("hazırlık: önceki test kalıntıları temizlenir", async () => {
    await cleanupTestAccounts()
    for (const email of Object.values(EMAILS)) expect(await findUserId(email)).toBeNull()
  })

  it("güvenlik: açık signUp ile metadata'dan rol alınamaz", async () => {
    const { data, error } = await anon().auth.signUp({ email: EMAILS.attacker, password: PASS, options: { data: { role: "admin", role_grant: "00000000-0000-0000-0000-000000000000" } } })
    expect(error).toBeNull()
    const id = data.user!.id
    const { data: prof } = await admin.from("profiles").select("role").eq("id", id).maybeSingle()
    report.signupRoleEscalation = prof?.role ?? "profil yok"
    expect(prof).toBeNull()
  })

  let signupId = ""
  it("(a) ücretsiz kayıt → doğrulama → UpPlan → bireysel listede → hesap silme", async () => {
    const res = await createStudentAccount(admin, {
      email: EMAILS.signup, password: PASS, fullName: "TEST Bireysel Kayıt", emailConfirmed: false, grade: "11",
      acquisition: { source: "ucretsiz_kayit", segment: "yks", alan: "ea", is_minor: true, utm_source: "e2e-test", utm_medium: "cpc", utm_campaign: "e2e" },
    })
    expect(res.ok).toBe(true)
    signupId = res.ok ? res.userId : ""

    // Doğrulanmadan giriş yapılamaz
    const before = await anon().auth.signInWithPassword({ email: EMAILS.signup, password: PASS })
    expect(before.error?.code).toBe("email_not_confirmed")

    // Doğrulama (programatik: e-postadaki bağlantının token'ı)
    const { data: link } = await admin.auth.admin.generateLink({ type: "magiclink", email: EMAILS.signup })
    const s = anon()
    const verify = await s.auth.verifyOtp({ type: "magiclink", token_hash: link.properties!.hashed_token })
    expect(verify.error).toBeNull()
    expect(verify.data.user?.email_confirmed_at).toBeTruthy()

    // Profil, kayıt, onaylar (18 yaş altı → veli beyanı dahil 4 onay)
    const [{ data: prof }, { data: stu }, { data: cons }, { data: acq }] = await Promise.all([
      admin.from("profiles").select("role, organization_id").eq("id", signupId).single(),
      admin.from("students").select("coach_id, organization_id, grade").eq("id", signupId).single(),
      admin.from("user_consents").select("consent_type, version").eq("user_id", signupId),
      admin.from("student_acquisition").select("*").eq("student_id", signupId).single(),
    ])
    expect(prof).toMatchObject({ role: "student", organization_id: null })
    expect(stu).toMatchObject({ coach_id: null, organization_id: null, grade: "11" })
    expect(cons?.map((c) => c.consent_type).sort()).toEqual(["gizlilik", "kullanim_sartlari", "kvkk_aydinlatma", "veli_bilgisi"])
    expect(acq).toMatchObject({ source: "ucretsiz_kayit", utm_source: "e2e-test", alan: "ea", is_minor: true })

    // İlk giriş yönlendirmesi koşulu: bireysel + UpPlan profili yok → /ogrenci/upplan/kurulum
    const { data: up0 } = await s.from("student_upplan_profile").select("student_id").eq("student_id", signupId).maybeSingle()
    expect(up0).toBeNull()

    // UpPlan kurulumu (saveUpplanProfile + advanceSetup('bitti') ile aynı, öğrenci oturumu)
    const { error: upErr } = await s.from("student_upplan_profile").upsert({
      student_id: signupId, status: "lise", grade: 11, segment: "yks", alan: "ea",
      availability: { "1": [30, 31, 32, 33] }, focus_minutes: 45, setup_step: "bitti", completed_at: new Date().toISOString(),
    })
    expect(upErr).toBeNull()

    // İlk soru kaydı
    const { data: subj } = await admin.from("subjects").select("id").eq("exam_type", "tyt").limit(1).single()
    const { error: ssErr } = await s.from("study_sessions").insert({
      student_id: signupId, subject_id: subj!.id, date: istanbulDateStr(), total_questions: 20, correct: 15, wrong: 3, empty: 2,
    })
    expect(ssErr).toBeNull()

    // Müdür paneli: Bireysel Öğrenciler listesi + özet kartlar
    const { all, row } = await overviewRow(signupId)
    expect(row).toMatchObject({ source: "ucretsiz_kayit", utm_source: "e2e-test", email_confirmed: true, upplan_completed: true, sessions_7d: 1, alan: "ea" })
    const summary = summarize(all.map(toRow))
    expect(summary.newToday).toBeGreaterThanOrEqual(1)
    report.signupOverview = { row, summary }

    // Hesap silme (öğrencinin kendi oturumuyla; tek transaction'lı RPC)
    const del = await deleteOwnAccount(admin, s, signupId)
    report.deleteRpc = del
    if (!del.ok && del.code === "PGRST202") {
      report.deleteRpcPending = "delete_my_account (migration 219) canlıda yok — test hesabı admin API ile silindi"
      await admin.auth.admin.deleteUser(signupId)
    } else {
      expect(del).toEqual({ ok: true })
    }

    const left = await residue(signupId, EMAILS.signup)
    report.signupResidue = left
    expect(left).toEqual({})
  })

  let coachId = ""
  it("(b) davet → token ile kabul → bireysel + kurulum → koç ata → listeden çıkar", async () => {
    // Test koçu (rol hibesiyle)
    const { data: grant } = await admin.from("auth_role_grants").insert({ email: EMAILS.coach, role: "coach" }).select("id").single()
    const { data: coach } = await admin.auth.admin.createUser({ email: EMAILS.coach, password: PASS, email_confirm: true, user_metadata: { role: "coach", full_name: "TEST Bireysel Koç", role_grant: grant!.id } })
    coachId = coach.user!.id
    const { data: coachProf } = await admin.from("profiles").select("role").eq("id", coachId).single()
    expect(coachProf?.role).toBe("coach")

    // Davet (müdür akışı; RLS ayrı test edildi → burada service role)
    const { data: mudur } = await admin.from("profiles").select("id").eq("role", "admin").limit(1).single()
    const { token, hash } = generateInviteToken()
    const { data: inv, error: invErr } = await admin.from("student_invitations").insert({
      email: EMAILS.invite, full_name: "TEST Bireysel Davet", segment: "yks", grade: "Mezun", token_hash: hash,
      invited_by: mudur!.id, expires_at: new Date(Date.now() + 7 * 864e5).toISOString(),
    }).select("id").single()
    expect(invErr).toBeNull()
    expect(inv!.id).toBeTruthy()

    const look = await lookupInvitationToken(admin, token)
    expect(look.ok).toBe(true)

    const acc = await acceptInvitation(admin, { token, password: PASS, isMinor: false })
    expect(acc.ok).toBe(true)
    if (!acc.ok) return
    expect(acc.individual).toBe(true)

    // Tek kullanımlık
    const again = await acceptInvitation(admin, { token, password: PASS, isMinor: false })
    expect(again.ok).toBe(false)
    expect(await lookupInvitationToken(admin, token)).toEqual({ ok: false, reason: "kullanildi" })

    const { data: invAfter } = await admin.from("student_invitations").select("status, accepted_user_id").eq("id", inv!.id).single()
    expect(invAfter).toMatchObject({ status: "kabul_edildi", accepted_user_id: acc.userId })

    // Giriş yapabilir (davet bağlantısı e-postayı doğrulamış sayılır), bireysel, UpPlan profili yok → kurulum
    const s = anon()
    expect((await s.auth.signInWithPassword({ email: EMAILS.invite, password: PASS })).error).toBeNull()
    const [{ data: stu }, { data: up }, { data: acq }] = await Promise.all([
      s.from("students").select("coach_id, organization_id, grade").eq("id", acc.userId).single(),
      s.from("student_upplan_profile").select("student_id").eq("student_id", acc.userId).maybeSingle(),
      admin.from("student_acquisition").select("source, invitation_id").eq("student_id", acc.userId).single(),
    ])
    expect(stu).toMatchObject({ coach_id: null, organization_id: null, grade: "Mezun" })
    expect(up).toBeNull()
    expect(acq).toMatchObject({ source: "davet", invitation_id: inv!.id })
    expect((await overviewRow(acc.userId)).row).toMatchObject({ source: "davet", email_confirmed: true, upplan_completed: false })

    // Koç ata: students.coach_id güncellemesi (change_student_coach'un yaptığı; devir trigger'ı çalışır)
    const { error: assignErr } = await admin.from("students").update({ coach_id: coachId }).eq("id", acc.userId)
    expect(assignErr).toBeNull()
    expect((await overviewRow(acc.userId)).row).toBeNull()
    const { data: hist } = await admin.from("coach_assignment_history").select("new_coach_id").eq("student_id", acc.userId)
    report.inviteFlow = { userId: acc.userId, coachHistory: hist }
  })

  afterAll(async () => {
    const ids: Record<string, string | null> = {}
    for (const [k, e] of Object.entries(EMAILS)) ids[k] = await findUserId(e)
    await cleanupTestAccounts()
    const after: Record<string, unknown> = {}
    for (const [k, id] of Object.entries(ids)) if (id) after[k] = await residue(id, EMAILS[k as keyof typeof EMAILS])
    report.cleanupResidue = after
    writeFileSync(process.env.E2E_REPORT ?? "bireysel-e2e.json", JSON.stringify(report, null, 2))
  })
})
