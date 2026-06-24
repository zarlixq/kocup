import { createClient } from "@/lib/supabase/server"
import { OrganizationsView, type OrgRow } from "@/components/mudur/organizations-view"

export const metadata = { title: "Kurumlar — Müdür" }

export default async function MudurKurumlarPage() {
  const supabase = await createClient()

  const [{ data: orgs }, { data: coaches }, { data: students }] = await Promise.all([
    supabase
      .from("organizations")
      .select(
        "id, name, slug, logo_url, primary_color, accent_color, contact_email, contact_phone, address, plan, is_active",
      )
      .order("name"),
    supabase
      .from("profiles")
      .select("id, organization_id")
      .eq("role", "coach")
      .not("organization_id", "is", null),
    supabase.from("students").select("id, organization_id").not("organization_id", "is", null),
  ])

  const coachCount = new Map<string, number>()
  for (const c of coaches ?? []) {
    if (c.organization_id) coachCount.set(c.organization_id, (coachCount.get(c.organization_id) ?? 0) + 1)
  }
  const studentCount = new Map<string, number>()
  for (const s of students ?? []) {
    if (s.organization_id) studentCount.set(s.organization_id, (studentCount.get(s.organization_id) ?? 0) + 1)
  }

  const rows: OrgRow[] = (orgs ?? []).map((o) => ({
    id: o.id,
    name: o.name,
    slug: o.slug,
    logo_url: o.logo_url ?? null,
    primary_color: o.primary_color ?? null,
    accent_color: o.accent_color ?? null,
    contact_email: o.contact_email ?? null,
    contact_phone: o.contact_phone ?? null,
    address: o.address ?? null,
    plan: o.plan,
    is_active: o.is_active,
    coach_count: coachCount.get(o.id) ?? 0,
    student_count: studentCount.get(o.id) ?? 0,
  }))

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-zinc-900">Kurumlar</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Dershane/kurumları yönet; koç ve öğrencilerini kurum detayından düzenle.
        </p>
      </header>

      <OrganizationsView rows={rows} />
    </div>
  )
}
