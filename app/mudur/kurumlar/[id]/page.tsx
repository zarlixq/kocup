import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import {
  OrganizationDetail,
  type DetailCoach,
  type DetailStudent,
} from "@/components/mudur/organization-detail"
import { OrgAdminSection, type OrgAdminRow } from "@/components/mudur/org-admin-section"

export const metadata = { title: "Kurum Detayı — Müdür" }

export default async function MudurKurumDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, slug, plan, is_active")
    .eq("id", id)
    .maybeSingle()
  if (!org) notFound()

  const [{ data: coachProfiles }, { data: studentRows }, { data: adminProfiles }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email, first_login_at")
        .eq("role", "coach")
        .eq("organization_id", id)
        .order("full_name"),
      supabase.from("students").select("id, coach_id, grade").eq("organization_id", id),
      supabase
        .from("profiles")
        .select("id, full_name, email, first_login_at")
        .eq("role", "org_admin")
        .eq("organization_id", id)
        .order("full_name"),
    ])

  const admins: OrgAdminRow[] = (adminProfiles ?? []).map((a) => ({
    id: a.id,
    full_name: a.full_name,
    email: a.email,
    status: a.first_login_at ? "aktif" : "beklemede",
  }))

  const studentIds = (studentRows ?? []).map((s) => s.id)
  const { data: studentProfiles } = studentIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, email, must_change_password, first_login_at")
        .in("id", studentIds)
    : { data: [] as Array<{ id: string; full_name: string; email: string; must_change_password: boolean; first_login_at: string | null }> }

  const profileById = new Map((studentProfiles ?? []).map((p) => [p.id, p]))
  const coachNameById = new Map((coachProfiles ?? []).map((c) => [c.id, c.full_name]))

  const students: DetailStudent[] = (studentRows ?? []).map((s) => {
    const p = profileById.get(s.id)
    return {
      id: s.id,
      full_name: p?.full_name ?? "—",
      email: p?.email ?? "",
      grade: s.grade,
      coach_id: s.coach_id,
      coach_name: s.coach_id ? coachNameById.get(s.coach_id) ?? null : null,
      // Kurum öğrencisi aktiflik: geçici şifre değiştirilmedi → beklemede, değiştirildi → aktif
      status: p?.must_change_password ? "beklemede" : "aktif",
    }
  })

  const studentCountByCoach = new Map<string, number>()
  for (const s of students) {
    if (s.coach_id) studentCountByCoach.set(s.coach_id, (studentCountByCoach.get(s.coach_id) ?? 0) + 1)
  }

  const coaches: DetailCoach[] = (coachProfiles ?? []).map((c) => ({
    id: c.id,
    full_name: c.full_name,
    email: c.email,
    status: c.first_login_at ? "aktif" : "beklemede",
    student_count: studentCountByCoach.get(c.id) ?? 0,
  }))

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <Link
          href="/mudur/kurumlar"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 mb-2"
        >
          <ArrowLeft className="h-4 w-4" /> Kurumlar
        </Link>
        <h1 className="text-2xl font-bold text-zinc-900">{org.name}</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {coaches.length} koç · {students.length} öğrenci · {org.is_active ? "Aktif" : "Pasif"}
        </p>
      </div>

      <OrgAdminSection orgId={org.id} admins={admins} />

      <OrganizationDetail orgId={org.id} coaches={coaches} students={students} />
    </div>
  )
}
