import { createClient } from "@/lib/supabase/server"
import { IndividualStudentsView } from "@/components/mudur/individual-students-view"
import { getWeeklyComplianceMap } from "@/lib/analytics/compliance"
import { mergeIndividualListPrefs } from "@/lib/analytics/ui-preferences"
import { getUiPreference } from "@/lib/analytics/ui-preferences-actions"
import type { IndividualStudentRow } from "@/lib/bireysel/overview"

export const metadata = { title: "Bireysel Öğrenciler — KoçUp" }

// Yalnız platform müdürü (role=admin): /mudur layout'u + RPC içi rol kontrolü.
export default async function BireyselOgrencilerPage() {
  const supabase = await createClient()

  const [{ data, error }, complianceMap, { data: orgs }, { data: coaches }, prefsRaw] = await Promise.all([
    supabase.rpc("individual_students_overview"),
    getWeeklyComplianceMap(supabase),
    supabase.from("organizations").select("id, name").eq("is_active", true).order("name"),
    supabase.from("profiles").select("id, full_name, organization_id").eq("role", "coach").order("full_name"),
    getUiPreference("mudur_individual_list"),
  ])
  if (error) console.error("individual_students_overview:", error)

  const students: IndividualStudentRow[] = (data ?? []).map((r) => ({
    id: r.student_id,
    full_name: r.full_name,
    email: r.email,
    created_at: r.created_at,
    source: r.source === "ucretsiz_kayit" || r.source === "davet" ? r.source : null,
    utm_source: r.utm_source,
    utm_medium: r.utm_medium,
    utm_campaign: r.utm_campaign,
    segment: r.segment,
    alan: r.alan,
    grade: r.grade,
    email_confirmed: r.email_confirmed,
    upplan_completed: r.upplan_completed,
    last_sign_in_at: r.last_sign_in_at,
    sessions_7d: r.sessions_7d,
    first_session_date: r.first_session_date,
    last_activity_date: r.last_activity_date,
    returned_d7: r.returned_d7,
    compliance_percent: complianceMap.get(r.student_id)?.percent ?? null,
  }))

  return (
    <div className="max-w-6xl mx-auto">
      <IndividualStudentsView
        students={students}
        organizations={(orgs ?? []).map((o) => ({ id: o.id, name: o.name }))}
        coaches={(coaches ?? []).map((c) => ({ id: c.id, name: c.full_name, organization_id: c.organization_id }))}
        initialPrefs={mergeIndividualListPrefs(prefsRaw)}
      />
    </div>
  )
}
