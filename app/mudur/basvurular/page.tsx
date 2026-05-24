import { createClient } from "@/lib/supabase/server"
import { ApplicationsView } from "@/components/mudur/applications-view"

export const metadata = { title: "Başvurular — KoçUp" }

export default async function BasvurularPage() {
  const supabase = await createClient()

  const [{ data: applications }, { data: coaches }, { data: students }] = await Promise.all([
    supabase
      .from("applications")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "coach")
      .order("full_name"),
    supabase.from("students").select("id, coach_id"),
  ])

  // Build lookups: student_id → coach name, reviewer_id → reviewer name
  const coachById: Record<string, string> = {}
  for (const c of coaches ?? []) coachById[c.id] = c.full_name

  const studentCoachLookup: Record<string, string> = {}
  for (const s of students ?? []) {
    if (s.coach_id && coachById[s.coach_id]) {
      studentCoachLookup[s.id] = coachById[s.coach_id]
    }
  }

  // Reviewer ids → fetch their profiles
  const reviewerIds = Array.from(
    new Set((applications ?? []).map((a) => a.reviewed_by).filter(Boolean) as string[])
  )
  const { data: reviewers } = reviewerIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", reviewerIds)
    : { data: [] as { id: string; full_name: string }[] }

  const reviewerLookup: Record<string, string> = {}
  for (const r of reviewers ?? []) reviewerLookup[r.id] = r.full_name

  return (
    <div className="max-w-6xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Başvurular</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Öğrenci başvurularını incele, onayla veya reddet.
        </p>
      </header>

      <ApplicationsView
        applications={applications ?? []}
        coaches={coaches ?? []}
        studentCoachLookup={studentCoachLookup}
        reviewerLookup={reviewerLookup}
      />
    </div>
  )
}
